/** 숫자를 한국식 축약으로 (1,234 / 1.2만 / 1.2억) */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "-";
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "억";
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, "") + "만";
  return n.toLocaleString("ko-KR");
}

/** 천 단위 콤마 */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("ko-KR");
}

/** ISO 날짜 → 2024.01.05 (한국 시간 기준) */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")}`;
}

/** ISO 날짜 → 14:30 (한국 시간, 24시간제) */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** 게시 후 경과 (n일 전 / n개월 전) */
export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "";
  const diff = Date.now() - d;
  const day = Math.floor(diff / 86400000);
  if (day < 1) return "오늘";
  if (day < 30) return `${day}일 전`;
  if (day < 365) return `${Math.floor(day / 30)}개월 전`;
  return `${Math.floor(day / 365)}년 전`;
}

/** 초 → 1:23 또는 1:02:03 */
export function formatDuration(sec: number): string {
  if (!sec || sec < 0) return "-";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 참여율 (%) = (좋아요 + 댓글) / 조회수 */
export function engagementRate(views: number, likes: number, comments: number): number {
  if (!views) return 0;
  return ((likes + comments) / views) * 100;
}
