/**
 * =============================================================================
 *  YouTube Data API (YouTubeData.gs)
 * =============================================================================
 *  채널 식별 → 업로드 영상 목록 → 영상별 조회수를 가져온다.
 *  별도 API 키 불필요: advanced service(YouTube)가 OAuth로 알아서 처리.
 * ========================================================================== */


/**
 * 설정의 채널 1개를 실제 채널 정보로 변환한다.
 * handle / channelId 둘 다 지원하며, handle 실패 시 검색(Search)으로 폴백.
 *
 * @return {{channelId, uploadsPlaylistId, title}} 또는 실패 시 null
 */
function resolveChannel_(ch) {
  const PART = 'snippet,contentDetails,statistics';
  try {
    let resp = null;

    if (ch.channelId) {
      // 1순위: channelId 로 직접 조회 (가장 정확)
      resp = YouTube.Channels.list(PART, { id: ch.channelId });

    } else if (ch.handle) {
      // 2순위: @handle 로 조회
      const handle = ch.handle.charAt(0) === '@' ? ch.handle : '@' + ch.handle;
      resp = YouTube.Channels.list(PART, { forHandle: handle });

      // handle 로 못 찾으면 검색으로 폴백
      if (!resp || !resp.items || !resp.items.length) {
        const search = YouTube.Search.list('snippet', {
          q: ch.handle, type: 'channel', maxResults: 1,
        });
        if (search.items && search.items.length) {
          const cid = search.items[0].snippet.channelId;
          resp = YouTube.Channels.list(PART, { id: cid });
        }
      }
    }

    if (!resp || !resp.items || !resp.items.length) {
      Logger.log('⚠️ 채널을 찾지 못했습니다: ' + ch.name);
      return null;
    }

    const item = resp.items[0];
    return {
      channelId:          item.id,
      uploadsPlaylistId:  item.contentDetails.relatedPlaylists.uploads,
      title:              item.snippet.title,
    };

  } catch (e) {
    Logger.log('⚠️ resolveChannel_ 오류 (' + ch.name + '): ' + e);
    return null;
  }
}


/**
 * 업로드 재생목록에서 최근 max개 영상의 (videoId, 제목, 게시일시)를 가져온다.
 * @return {Array<{videoId, title, publishedAt}>}
 */
function fetchVideos_(uploadsPlaylistId, max) {
  const out = [];
  let pageToken = undefined;

  while (out.length < max) {
    const resp = YouTube.PlaylistItems.list('snippet,contentDetails', {
      playlistId: uploadsPlaylistId,
      maxResults: Math.min(50, max - out.length),
      pageToken: pageToken,
    });
    if (!resp.items || !resp.items.length) break;

    resp.items.forEach(function (it) {
      out.push({
        videoId:     it.contentDetails.videoId,
        title:       it.snippet.title,
        // 영상 실제 게시 시각(videoPublishedAt)이 정확. 없으면 재생목록 추가 시각으로 폴백.
        publishedAt: it.contentDetails.videoPublishedAt || it.snippet.publishedAt,
      });
    });

    if (!resp.nextPageToken) break;
    pageToken = resp.nextPageToken;
  }

  return out.slice(0, max);
}


/**
 * 영상 id 배열 → { videoId: 조회수 } 맵. (한 번에 최대 50개씩 조회)
 */
function fetchVideoStats_(videoIds) {
  const map = {};
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const resp = YouTube.Videos.list('statistics', { id: chunk.join(',') });
    (resp.items || []).forEach(function (v) {
      map[v.id] = Number((v.statistics && v.statistics.viewCount) || 0);
    });
  }
  return map;
}
