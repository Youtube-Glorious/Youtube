import Link from "next/link";
import { notFound } from "next/navigation";
import { CHANNELS, getChannelConfig } from "@/lib/channels";
import { getChannelData } from "@/lib/youtube";
import { StatCard } from "@/components/StatCard";
import { TypeBadge } from "@/components/TypeBadge";
import { BarList } from "@/components/BarList";
import { VideoTable } from "@/components/VideoTable";
import { formatCompact } from "@/lib/format";

export const revalidate = 3600;

export function generateStaticParams() {
  return CHANNELS.map((c) => ({ id: c.id }));
}

export default async function ChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cfg = getChannelConfig(id);
  if (!cfg) notFound();

  let data;
  try {
    data = await getChannelData(cfg, 20);
  } catch (e) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-6">
          <h1 className="text-lg font-bold text-slate-800">{cfg.name}</h1>
          <p className="mt-2 text-sm text-red-500">{e instanceof Error ? e.message : String(e)}</p>
        </div>
      </div>
    );
  }

  const topVideos = [...data.recentVideos]
    .sort((a, b) => b.views - a.views)
    .slice(0, 8)
    .map((v) => ({ label: v.title, value: v.views }));

  const accent = cfg.type === "쇼츠" ? "#E0B800" : "#787FFF";

  return (
    <div className="space-y-8">
      <BackLink />

      {/* 채널 헤더 */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.avatar} alt={data.title} className="h-16 w-16 rounded-full bg-slate-100 object-cover" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{data.title}</h1>
            <TypeBadge type={cfg.type} />
          </div>
          <a
            href={`https://www.youtube.com/channel/${data.channelId}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-slate-400 hover:text-brand"
          >
            유튜브에서 열기 ↗
          </a>
        </div>
      </section>

      {/* KPI */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon="👥" label="구독자" value={formatCompact(data.subscribers)} />
        <StatCard icon="▶️" label="총 조회수" value={formatCompact(data.totalViews)} />
        <StatCard icon="🎬" label="총 영상 수" value={formatCompact(data.videoCount)} />
      </section>

      {/* 조회수 상위 영상 */}
      {topVideos.length > 0 && (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="mb-4 text-sm font-semibold text-slate-500">최근 영상 중 조회수 TOP</h2>
          <BarList items={topVideos} accent={accent} />
        </section>
      )}

      {/* 최근 영상 표 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-400">
          최근 영상 ({data.recentVideos.length})
        </h2>
        {data.recentVideos.length > 0 ? (
          <VideoTable videos={data.recentVideos} />
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-400">
            표시할 영상이 없습니다.
          </div>
        )}
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
      ← 전체 채널
    </Link>
  );
}
