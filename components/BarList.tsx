import { formatCompact } from "@/lib/format";

export interface BarItem {
  label: string;
  value: number;
}

/** 의존성 없는 가벼운 가로 막대 차트 (조회수 상위 영상 등) */
export function BarList({ items, accent = "#787FFF" }: { items: BarItem[]; accent?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-2.5">
      {items.map((it, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <div className="w-1/2 truncate text-sm text-slate-600" title={it.label}>
            {it.label}
          </div>
          <div className="flex flex-1 items-center gap-2">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${(it.value / max) * 100}%`, background: accent }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-500">
              {formatCompact(it.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
