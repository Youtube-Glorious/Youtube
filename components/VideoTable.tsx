import { VideoStat } from "@/lib/youtube";
import { formatNumber, formatDate, formatTime, formatDuration, engagementRate } from "@/lib/format";

export function VideoTable({ videos }: { videos: VideoStat[] }) {
  return (
    <div className="scroll-thin overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-card">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
            <th className="px-4 py-3 font-medium">영상</th>
            <th className="px-4 py-3 font-medium">길이</th>
            <th className="px-4 py-3 font-medium">게시일시</th>
            <th className="px-4 py-3 text-right font-medium">조회수</th>
            <th className="px-4 py-3 text-right font-medium">좋아요</th>
            <th className="px-4 py-3 text-right font-medium">댓글</th>
            <th className="px-4 py-3 text-right font-medium">참여율</th>
          </tr>
        </thead>
        <tbody>
          {videos.map((v) => {
            const er = engagementRate(v.views, v.likes, v.comments);
            return (
              <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <a
                    href={`https://www.youtube.com/watch?v=${v.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 hover:text-brand"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.thumbnail} alt="" className="h-9 w-16 rounded-md bg-slate-100 object-cover" />
                    <span className="line-clamp-2 max-w-xs font-medium text-slate-800">{v.title}</span>
                  </a>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={
                      "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums " +
                      (v.isShort ? "bg-shorts text-shorts-ink" : "bg-slate-100 text-slate-600")
                    }
                  >
                    {v.isShort ? "쇼츠 " : ""}
                    {formatDuration(v.durationSec)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  <div>{formatDate(v.publishedAt)}</div>
                  <div className="text-xs text-slate-400">{formatTime(v.publishedAt)}</div>
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                  {formatNumber(v.views)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">{formatNumber(v.likes)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">{formatNumber(v.comments)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <span className={er >= 5 ? "font-semibold text-emerald-600" : "text-slate-500"}>
                    {er.toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
