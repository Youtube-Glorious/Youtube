import Link from "next/link";
import { ChannelData } from "@/lib/youtube";
import { ChannelConfig } from "@/lib/channels";
import { formatCompact } from "@/lib/format";
import { TypeBadge } from "./TypeBadge";

export function ChannelCard({ data }: { data: ChannelData }) {
  return (
    <Link
      href={`/channel/${data.config.id}`}
      className="group block rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.avatar}
          alt={data.title}
          className="h-12 w-12 rounded-full bg-slate-100 object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-bold text-slate-900">{data.title}</h3>
            <TypeBadge type={data.config.type} />
          </div>
          <p className="truncate text-xs text-slate-400">{data.config.name}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini label="구독자" value={formatCompact(data.subscribers)} />
        <Mini label="총 조회수" value={formatCompact(data.totalViews)} />
        <Mini label="영상" value={formatCompact(data.videoCount)} />
      </div>

      <div className="mt-4 text-right text-sm font-semibold text-brand opacity-0 transition group-hover:opacity-100">
        자세히 보기 →
      </div>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2">
      <div className="text-base font-extrabold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

export function ChannelErrorCard({ config, error }: { config: ChannelConfig; error: string }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
      <h3 className="font-bold text-slate-800">{config.name}</h3>
      <p className="mt-2 text-xs leading-relaxed text-red-500">{error}</p>
    </div>
  );
}
