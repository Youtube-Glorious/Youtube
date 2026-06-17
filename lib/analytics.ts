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

/** 구글 API 에러 응답에서 사람이 읽을 수 있는 이유를 뽑아낸다. */
async function describeError(res: Response): Promise<string> {
  let detail = "";
  try {
    const j = await res.json();
    detail = j?.error?.message || j?.error?.errors?.[0]?.reason || "";
  } catch {
    /* 본문이 JSON이 아니면 상태 코드만 사용 */
  }
  return `${res.status}${detail ? " " + detail : ""}`;
}

export interface ChannelRevenueResult {
  /** 영상ID → 예상 수익(USD) */
  byVideo: Record<string, number>;
  /** 연결된(로그인된) 구글 계정 수 */
  accounts: number;
  /** 이 채널을 소유/관리하는 계정(=200 응답)을 찾았는지 */
  matchedOwner: boolean;
  /** 마지막으로 만난 API 에러(있으면). 진단 안내용. */
  apiError?: string;
}

/**
 * 채널의 영상별 예상 수익(USD)을 가져온다.
 * 저장된 계정 토큰들을 차례로 시도해서, 그 채널을 소유한 계정의 토큰으로 성공시킨다.
 * (계정이 여러 개여도 자동으로 맞는 계정이 처리됨)
 *
 * 수익이 비어 있을 때 "왜 안 나오는지"를 알 수 있도록 진단 정보를 함께 반환한다:
 *  - accounts === 0      → 연결된 계정 없음(로그인 필요)
 *  - matchedOwner === false → 어떤 계정도 이 채널 소유가 아님(다른 계정 로그인 필요/권한 없음)
 *  - matchedOwner === true 인데 byVideo 비어 있음 → 소유 계정은 찾았으나 수익 0
 *    (채널이 아직 수익 창출(YPP) 상태가 아니거나 해당 기간 수익이 없음)
 */
export async function getChannelRevenueUSD(channelId: string): Promise<ChannelRevenueResult> {
  await ensureTables();
  const { rows } = await sql`SELECT refresh_token FROM google_accounts`;
  const today = new Date().toISOString().slice(0, 10);

  let matchedOwner = false;
  let apiError: string | undefined;

  for (const r of rows) {
    const token = await accessTokenFrom(r.refresh_token as string);
    if (!token) {
      apiError = "토큰 갱신 실패 (재로그인이 필요할 수 있어요)";
      continue;
    }

    const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
    url.searchParams.set("ids", `channel==${channelId}`);
    url.searchParams.set("startDate", "2005-01-01");
    url.searchParams.set("endDate", today);
    url.searchParams.set("metrics", "estimatedRevenue");
    url.searchParams.set("dimensions", "video");
    url.searchParams.set("sort", "-estimatedRevenue");
    url.searchParams.set("maxResults", "200");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      // 이 계정은 이 채널 권한 없음(403 등) → 이유를 기록하고 다음 계정 시도
      apiError = await describeError(res);
      continue;
    }

    // 200 응답 = 이 계정이 채널을 소유/관리함 (=올바른 계정을 찾음)
    matchedOwner = true;
    const data = await res.json();
    const map: Record<string, number> = {};
    if (Array.isArray(data.rows)) {
      for (const row of data.rows) map[row[0]] = Number(row[1] || 0);
    }
    // 소유 계정을 찾았으면 (수익이 0이어도) 그 결과를 그대로 반환한다.
    return { byVideo: map, accounts: rows.length, matchedOwner: true };
  }

  return { byVideo: {}, accounts: rows.length, matchedOwner, apiError };
}

/** 연결된 계정 수 (설정 안내용) */
export async function connectedAccountCount(): Promise<number> {
  await ensureTables();
  const { rows } = await sql`SELECT count(*)::int AS n FROM google_accounts`;
  return Number(rows[0]?.n || 0);
}
