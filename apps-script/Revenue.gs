/**
 * =============================================================================
 *  YouTube Analytics API — 수익 수집 (Revenue.gs)
 * =============================================================================
 *  영상별 예상 수익(estimatedRevenue, USD)을 가져온다.
 *
 *  ⚠️ 중요: 본인 소유 + 수익창출(YPP) 채널만 가능.
 *     권한이 없거나 실패하면 조용히 건너뛰고 로그만 남긴다(전체 갱신은 계속 진행).
 *
 *  반환값은 USD. 원화 환산은 시트 수식(USD × USDKRW)이 담당한다.
 * ========================================================================== */


/**
 * 한 채널의 영상별 예상 수익(USD)을 { videoId: usd } 맵으로 반환.
 * 실패 시 빈 객체 {} 반환.
 */
function fetchRevenue_(channelId) {
  const map = {};
  try {
    const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');

    const resp = YouTubeAnalytics.Reports.query({
      ids:        'channel==' + channelId,
      startDate:  '2005-01-01',           // 유튜브 개설 이전 ~ 오늘 = 전체 기간
      endDate:    today,
      metrics:    'estimatedRevenue',
      dimensions: 'video',
      sort:       '-estimatedRevenue',
      maxResults: 200,
    });

    // rows 형식: [ [videoId, estimatedRevenue], ... ]
    if (resp && resp.rows) {
      resp.rows.forEach(function (row) {
        map[row[0]] = Number(row[1] || 0);
      });
      Logger.log('💰 수익 수집 성공 (' + channelId + '): ' + resp.rows.length + '개 영상');
    }

  } catch (e) {
    // 권한 없음/수익창출 아님/일시 오류 등 → 건너뛰고 로그만
    Logger.log('ℹ️ 수익 건너뜀 (' + channelId + '): ' + e);
  }
  return map;
}
