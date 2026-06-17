import "server-only";
import { ensureTables, sql } from "./db";

/** refresh token → access token */
async function accessTokenFrom(refresh: string): Promise<string | null> {
  const params = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID || "",
    client_secret: process.env.AUTH_GOOGLE_SECRET || "",
    refresh_token: refresh,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

/**
 * 구글 API 에러 응답에서 사람이 읽을 수 있는 이유를 뽑아낸다.
 * 메시지가 막연한 "Forbidden" 등이어도 reason/status 코드를 함께 붙여
 * 원인(accessNotConfigured / ACCESS_TOKEN_SCOPE_INSUFFICIENT / forbidden 등)을 구분할 수 있게 한다.
 */
async function describeError(res: Response): Promise<string> {
  let detail = "";
  try {
    const j = await res.json();
    const err = j?.error;
    const msg: string = err?.message || "";
    const reason: string = err?.errors?.[0]?.reason || err?.status || "";
    // reason 코드가 메시지에 이미 들어있지 않으면 [코드] 형태로 덧붙인다.
    detail = reason && !msg.includes(reason) ? `${msg} [${reason}]`.trim() : msg;
  } catch {
    /* 본문이 JSON이 아니면 상태 코드만 사용 */
  }
  return `${res.status}${detail ? " " + detail : ""}`;
}

/**
 * OAuth 토큰이 실제로 소유/관리하는 채널 목록(Data API mine=true).
 * 토큰의 "현재 채널 컨텍스트"를 그대로 반영하므로, 이 목록에 대상 채널이 없으면
 * Analytics 가 403(forbidden) 을 내는 이유가 된다. (진단 핵심)
 */
async function ownedChannels(token: string): Promise<{ id: string; title: string }[]> {
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("mine", "true");
    url.searchParams.set("maxResults", "50");
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data.items) ? data.items : []).map(
      (it: { id: string; snippet?: { title?: string } }) => ({
        id: it.id,
        title: it?.snippet?.title || it.id,
      })
    );
  } catch {
    return [];
  }
}

export interface ChannelRevenueResult {
  /** 영상ID → 예상 수익(USD) */
  byVideo: Record<string, number>;
  /** 연결된(로그인된) 구글 계정 수 */
  accounts: number;
  /** 이 채널을 소유/관리하는 계정(=Analytics 접근 가능)을 찾았는지 */
  matchedOwner: boolean;
  /** 기본 분석(views)은 되는데 수익(monetary)만 403 → YPP 미승인 또는 monetary 권한 미동의 */
  monetaryDenied?: boolean;
  /** 마지막으로 만난 API 에러(있으면). 진단 안내용. */
  apiError?: string;
  /** 조회 대상 채널 ID (진단용) */
  targetChannelId: string;
  /** 연결된 계정들이 실제 소유한 채널 목록 (진단용). 대상이 여기 없으면 그래서 403. */
  owned: { id: string; title: string }[];
}

/** YouTube Analytics 리포트 호출 (공통). */
function reportUrl(channelId: string, metrics: string, endDate: string, extra: Record<string, string> = {}): string {
  const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  url.searchParams.set("ids", `channel==${channelId}`);
  url.searchParams.set("startDate", "2005-01-01");
  url.searchParams.set("endDate", endDate);
  url.searchParams.set("metrics", metrics);
  for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  return url.toString();
}

/**
 * 채널의 영상별 예상 수익(USD)을 가져온다.
 * 저장된 계정 토큰들을 차례로 시도해서, 그 채널을 소유한 계정의 토큰으로 성공시킨다.
 * (계정이 여러 개여도 자동으로 맞는 계정이 처리됨)
 *
 * 수익이 비어 있을 때 "왜 안 나오는지"를 알 수 있도록 진단 정보를 함께 반환한다:
 *  - accounts === 0          → 연결된 계정 없음(로그인 필요)
 *  - matchedOwner === false  → 어떤 계정도 이 채널 소유가 아님(다른 계정 로그인 필요/권한 없음)
 *  - monetaryDenied === true → 분석 권한은 있으나 수익(monetary)만 막힘
 *                              (수익 창출(YPP) 미승인 또는 monetary scope 미동의)
 *  - matchedOwner === true 인데 byVideo 비어 있음 → 소유 계정은 찾았으나 수익 0
 */
export async function getChannelRevenueUSD(channelId: string): Promise<ChannelRevenueResult> {
  await ensureTables();
  const { rows } = await sql`SELECT refresh_token FROM google_accounts`;
  const today = new Date().toISOString().slice(0, 10);

  let matchedOwner = false;
  let apiError: string | undefined;
  const ownedMap = new Map<string, string>(); // 연결 계정들이 소유한 채널 누적 (id→title)

  for (const r of rows) {
    const token = await accessTokenFrom(r.refresh_token as string);
    if (!token) {
      apiError = "토큰 갱신 실패 (재로그인이 필요할 수 있어요)";
      continue;
    }
    const headers = { Authorization: `Bearer ${token}` };

    // 1) 수익(monetary) 리포트
    const res = await fetch(
      reportUrl(channelId, "estimatedRevenue", today, {
        dimensions: "video",
        sort: "-estimatedRevenue",
        maxResults: "200",
      }),
      { headers, cache: "no-store" }
    );

    if (res.ok) {
      // 200 = 이 계정이 채널을 소유/관리함 (=올바른 계정)
      const data = await res.json();
      const map: Record<string, number> = {};
      if (Array.isArray(data.rows)) {
        for (const row of data.rows) map[row[0]] = Number(row[1] || 0);
      }
      return { byVideo: map, accounts: rows.length, matchedOwner: true, targetChannelId: channelId, owned: [] };
    }

    // 수익 쿼리 403 등 → 같은 채널을 기본 지표(views)로 찔러 "소유 vs 수익전용 거부" 구분
    apiError = await describeError(res);
    const probe = await fetch(reportUrl(channelId, "views", today), { headers, cache: "no-store" });
    if (probe.ok) {
      // 기본 분석은 됨 = 소유 계정인데 수익만 막힘 → 더 볼 것 없이 종료
      return {
        byVideo: {},
        accounts: rows.length,
        matchedOwner: true,
        monetaryDenied: true,
        apiError,
        targetChannelId: channelId,
        owned: [],
      };
    }

    // 기본 분석도 거부 → 이 계정은 이 채널 소유가 아님.
    // 이 토큰이 "실제로" 무슨 채널을 소유했는지 모아 두었다가 진단에 보여준다.
    for (const o of await ownedChannels(token)) ownedMap.set(o.id, o.title);
  }

  return {
    byVideo: {},
    accounts: rows.length,
    matchedOwner,
    apiError,
    targetChannelId: channelId,
    owned: [...ownedMap.entries()].map(([id, title]) => ({ id, title })),
  };
}

/** 연결된 계정 수 (설정 안내용) */
export async function connectedAccountCount(): Promise<number> {
  await ensureTables();
  const { rows } = await sql`SELECT count(*)::int AS n FROM google_accounts`;
  return Number(rows[0]?.n || 0);
}
