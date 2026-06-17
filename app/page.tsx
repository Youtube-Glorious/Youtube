import { CHANNELS, DEFAULT_COST_PER_VIDEO } from "@/lib/channels";
import { getChannelDataSafe } from "@/lib/youtube";
import { ChannelCard, ChannelErrorCard } from "@/components/ChannelCard";
import { ChannelProfitCompare } from "@/components/ChannelProfitCompare";
import { StatCard } from "@/components/StatCard";
import { formatCompact } from "@/lib/format";

// 1시간마다 재생성
export const revalidate = 3600;

export default async function HomePage() {
  const results = await Promise.all(CHANNELS.map((c) => getChannelDataSafe(c, 20)));
  const ok = results.filter((r) => r.ok) as Extract<(typeof results)[number], { ok: true }>[];

  const totalSubs = ok.reduce((s, r) => s + r.data.subscribers, 0);
  const totalViews = ok.reduce((s, r) => s + r.data.totalViews, 0);
  const totalVideos = ok.reduce((s, r) => s + r.data.videoCount, 0);

  // 홈의 채널별 순이익 비교에 넘길 가벼운 데이터 (수익·비용은 클라이언트에서 로그인 후 조회)
  const compareChannels = ok.map((r) => ({
    id: r.data.config.id,
    name: r.data.config.name,
    type: r.data.config.type,
    channelId: r.data.channelId,
    videos: r.data.recentVideos.map((v) => ({ id: v.id, isShort: v.isShort })),
    defaultCost: r.data.config.costPerVideo ?? DEFAULT_COST_PER_VIDEO,
  }));

  const keyMissing = results.every((r) => !r.ok) && results.length > 0;

  return (
    <div className="space-y-8">
      {/* 환경변수 미설정 안내 */}
      {keyMissing && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-bold">⚠️ YouTube API 키가 설정되지 않았어요</p>
          <p className="mt-1 leading-relaxed">
            <code className="rounded bg-amber-100 px-1">YOUTUBE_API_KEY</code> 환경변수를 추가해야 데이터가 나옵니다.
            로컬은 <code className="rounded bg-amber-100 px-1">.env.local</code>, Vercel은 프로젝트 Settings →
            Environment Variables 에 넣으세요. (자세한 건 README 참고)
          </p>
        </div>
      )}

      {/* 전체 요약 */}
      {ok.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-400">전체 요약 ({ok.length}개 채널)</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard icon="👥" label="총 구독자" value={formatCompact(totalSubs)} />
            <StatCard icon="▶️" label="총 조회수" value={formatCompact(totalViews)} />
            <StatCard icon="🎬" label="총 영상 수" value={formatCompact(totalVideos)} />
          </div>
        </section>
      )}

      {/* 채널별 순이익 비교 (로그인 시) */}
      {compareChannels.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-400">채널별 순이익 비교</h2>
          <ChannelProfitCompare channels={compareChannels} />
        </section>
      )}

      {/* 채널 그리드 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-400">채널</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r, i) =>
            r.ok ? (
              <ChannelCard key={i} data={r.data} />
            ) : (
              <ChannelErrorCard key={i} config={r.config} error={r.error} />
            )
          )}
        </div>
      </section>
    </div>
  );
}
