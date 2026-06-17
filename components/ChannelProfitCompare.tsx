"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { formatNumber } from "@/lib/format";
import { computeVideoCost } from "@/lib/cost";
import type { ChannelType } from "@/lib/channels";
import { TypeBadge } from "./TypeBadge";

export interface CompareChannel {
  id: string;
  name: string;
  type: ChannelType;
  channelId: string;
  /** 비교 기준이 되는 최근 영상들 (상세 페이지 표와 동일 기준) */
  videos: { id: string; isShort: boolean }[];
  defaultCost: number;
}

export function ChannelProfitCompare({ channels }: { channels: CompareChannel[] }) {
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [revByCh, setRevByCh] = useState<Record<string, Record<string, number>>>({});
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    setState("loading");
    (async () => {
      try {
        const cRes = await fetch("/api/costs");
        if (cRes.status === 401) {
          if (alive) setState("error");
          return;
        }
        const cData = cRes.ok ? await cRes.json() : { costs: {} };
        const revResults = await Promise.all(
          channels.map(async (ch) => {
            const r = await fetch(`/api/revenue?channelId=${encodeURIComponent(ch.channelId)}`);
            const d = r.ok ? await r.json() : {};
            return [ch.id, (d.byVideo as Record<string, number>) || {}] as const;
          })
        );
        if (!alive) return;
        setCosts(cData.costs || {});
        const map: Record<string, Record<string, number>> = {};
        for (const [id, by] of revResults) map[id] = by;
        setRevByCh(map);
        setState("ok");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [status, channels]);

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-brand-light px-4 py-3 text-sm text-slate-700">
        <span>
          🔒 로그인하면 <b>채널별 순이익</b>을 한눈에 비교할 수 있어요.
        </span>
        <button
          onClick={() => signIn("google")}
          className="shrink-0 rounded-full bg-brand px-3 py-1 font-semibold text-white hover:bg-brand-dark"
        >
          구글 로그인
        </button>
      </div>
    );
  }

  // 채널별 합계 계산 (상세 페이지 표와 같은 영상 집합·같은 비용 규칙)
  const rows = channels
    .map((ch) => {
      const showCost = ch.type !== "롱폼";
      const rev = revByCh[ch.id] || {};
      let revenue = 0;
      let cost = 0;
      for (const v of ch.videos) {
        revenue += rev[v.id] || 0;
        cost += computeVideoCost({
          showCost,
          isShort: v.isShort,
          savedCost: v.id in costs ? costs[v.id] : undefined,
          defaultCost: ch.defaultCost,
        });
      }
      return { ...ch, showCost, revenue, cost, profit: revenue - cost };
    })
    .sort((a, b) => b.profit - a.profit);

  const sum = rows.reduce(
    (s, r) => ({ revenue: s.revenue + r.revenue, cost: s.cost + r.cost, profit: s.profit + r.profit }),
    { revenue: 0, cost: 0, profit: 0 }
  );
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.profit)));

  if (state === "loading" || state === "idle") {
    return <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-400">불러오는 중…</div>;
  }
  if (state === "error") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
        순이익을 불러오지 못했어요. 채널 페이지에서 계정 연결/권한을 확인하세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 합계 */}
      <div className="grid grid-cols-3 gap-3">
        <Mini label="합계 수익" value={sum.revenue} />
        <Mini label="합계 비용" value={sum.cost} />
        <Mini label="합계 순이익" value={sum.profit} negativeRed />
      </div>

      {/* 채널별 막대 */}
      <div className="space-y-2">
        {rows.map((r) => {
          const pct = (Math.abs(r.profit) / maxAbs) * 100;
          const positive = r.profit >= 0;
          return (
            <div key={r.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/channel/${r.id}`} className="flex items-center gap-2 font-semibold text-slate-900 hover:text-brand">
                  <span className="truncate">{r.name}</span>
                  <TypeBadge type={r.type} />
                </Link>
                <span className={"shrink-0 tabular-nums font-extrabold " + (positive ? "text-slate-900" : "text-red-500")}>
                  ₩{formatNumber(r.profit)}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={"h-full rounded-full " + (positive ? "bg-emerald-500" : "bg-red-400")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400 tabular-nums">
                <span>수익 ₩{formatNumber(r.revenue)}</span>
                {r.showCost && <span>비용 ₩{formatNumber(r.cost)}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">※ 채널 상세 페이지의 최근 영상 표 기준 합계입니다.</p>
    </div>
  );
}

function Mini({ label, value, negativeRed }: { label: string; value: number; negativeRed?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-card">
      <div className={"text-lg font-extrabold tabular-nums " + (negativeRed && value < 0 ? "text-red-500" : "text-slate-900")}>
        ₩{formatNumber(value)}
      </div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}
