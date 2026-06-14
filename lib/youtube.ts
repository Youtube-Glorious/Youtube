/**
 * YouTube Data API v3 클라이언트 (서버 전용)
 *
 * - API 키는 process.env.YOUTUBE_API_KEY 에서만 읽습니다 → 브라우저에 노출되지 않음.
 * - fetch 의 next.revalidate 로 결과를 캐시해 API 할당량(quota) 낭비를 막습니다.
 */
import "server-only";
import { ChannelConfig } from "./channels";

const BASE = "https://www.googleapis.com/youtube/v3";

export interface VideoStat {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  durationSec: number; // 영상 길이(초)
  isShort: boolean;    // 60초 이하 = 쇼츠로 간주
}

export interface ChannelData {
  config: ChannelConfig;
  channelId: string;
  title: string;
  avatar: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  recentVideos: VideoStat[];
}

/** 키가 없을 때 명확한 메시지로 실패시킨다 (UI에서 안내문으로 잡음). */
function apiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error(
      "YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다. .env.local 또는 Vercel 환경변수에 추가하세요."
    );
  }
  return key;
}

async function yt<T>(
  path: string,
  params: Record<string, string>,
  revalidate: number
): Promise<T> {
  const url = new URL(`${BASE}/${path}`);
  Object.entries({ ...params, key: apiKey() }).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  );

  const res = await fetch(url.toString(), { next: { revalidate } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YouTube API 오류 (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** 설정 → 실제 channelId 해석 (channelId > handle > 이름 검색 순) */
async function resolveChannelId(cfg: ChannelConfig): Promise<string> {
  if (cfg.channelId) return cfg.channelId;

  if (cfg.handle) {
    const handle = cfg.handle.startsWith("@") ? cfg.handle : `@${cfg.handle}`;
    const data = await yt<{ items?: { id: string }[] }>(
      "channels",
      { part: "id", forHandle: handle },
      60 * 60 * 24 // 채널 ID는 잘 안 바뀌므로 24시간 캐시
    );
    if (data.items?.length) return data.items[0].id;
  }

  // 폴백: 이름으로 검색
  const q = cfg.query || cfg.name;
  const search = await yt<{ items?: { id: { channelId: string } }[] }>(
    "search",
    { part: "snippet", type: "channel", q, maxResults: "1" },
    60 * 60 * 24
  );
  const id = search.items?.[0]?.id?.channelId;
  if (!id) throw new Error(`채널을 찾지 못했습니다: ${cfg.name}`);
  return id;
}

interface ChannelsResp {
  items?: {
    id: string;
    snippet: { title: string; thumbnails: { default?: { url: string }; medium?: { url: string } } };
    statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string };
    contentDetails: { relatedPlaylists: { uploads: string } };
  }[];
}

interface PlaylistResp {
  items?: { contentDetails: { videoId: string } }[];
}

interface VideosResp {
  items?: {
    id: string;
    snippet: { title: string; publishedAt: string; thumbnails: { medium?: { url: string }; high?: { url: string } } };
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
    contentDetails: { duration: string };
  }[];
}

/** ISO8601 길이(PT#H#M#S) → 초 */
function parseDuration(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "");
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

/** 한 채널의 전체 데이터(통계 + 최근 영상)를 가져온다. */
export async function getChannelData(cfg: ChannelConfig, maxVideos = 12): Promise<ChannelData> {
  const channelId = await resolveChannelId(cfg);

  const ch = await yt<ChannelsResp>(
    "channels",
    { part: "snippet,statistics,contentDetails", id: channelId },
    60 * 60
  );
  const item = ch.items?.[0];
  if (!item) throw new Error(`채널 정보를 불러오지 못했습니다: ${cfg.name}`);

  const uploads = item.contentDetails.relatedPlaylists.uploads;

  const pl = await yt<PlaylistResp>(
    "playlistItems",
    { part: "contentDetails", playlistId: uploads, maxResults: String(maxVideos) },
    60 * 60
  );
  const videoIds = (pl.items || []).map((i) => i.contentDetails.videoId);

  let recentVideos: VideoStat[] = [];
  if (videoIds.length) {
    const vids = await yt<VideosResp>(
      "videos",
      { part: "snippet,statistics,contentDetails", id: videoIds.join(",") },
      60 * 60
    );
    recentVideos = (vids.items || []).map((v) => {
      const durationSec = parseDuration(v.contentDetails.duration);
      return {
        id: v.id,
        title: v.snippet.title,
        publishedAt: v.snippet.publishedAt,
        thumbnail: v.snippet.thumbnails.medium?.url || v.snippet.thumbnails.high?.url || "",
        views: Number(v.statistics.viewCount || 0),
        likes: Number(v.statistics.likeCount || 0),
        comments: Number(v.statistics.commentCount || 0),
        durationSec,
        isShort: durationSec > 0 && durationSec <= 60,
      };
    });
  }

  return {
    config: cfg,
    channelId,
    title: item.snippet.title,
    avatar: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || "",
    subscribers: Number(item.statistics.subscriberCount || 0),
    totalViews: Number(item.statistics.viewCount || 0),
    videoCount: Number(item.statistics.videoCount || 0),
    recentVideos,
  };
}

/** 에러가 나도 페이지 전체가 죽지 않도록 안전 래퍼 */
export async function getChannelDataSafe(
  cfg: ChannelConfig,
  maxVideos = 12
): Promise<{ ok: true; data: ChannelData } | { ok: false; config: ChannelConfig; error: string }> {
  try {
    return { ok: true, data: await getChannelData(cfg, maxVideos) };
  } catch (e) {
    return { ok: false, config: cfg, error: e instanceof Error ? e.message : String(e) };
  }
}
