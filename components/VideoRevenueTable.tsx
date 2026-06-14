"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import {
  formatNumber,
  formatDate,
  formatTime,
  formatDuration,
  engagementRate,
} from "@/lib/format";

export interface VideoRow {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  durationSec: number;
  isShort: boolean;
}

export function VideoRevenueTable({
  channelId,
  videos,
  defaultCost = 0,
}: {
  channelId: string;
  videos: VideoRow[];
  defaultCost?: number;
}) {
  const { status } = useSession();
  const [costs, setCosts] = useState<Record<string, number>>({});
  const [revenue, setRevenue] = useState<Record<string, number>>({});
  const [revState, setRevState] = useState<"idle" | "loading" | "ok" | "unauth" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const loggedIn = status === "authenticated";

  // 로그인 상태면 비용 + 수익 불러오기
  useEffect(() => {
    if (status !== "authenticated") {
      if (status === "unauthenticated") setRevState("unauth");
      return;
    }
    let alive = true;
    setRevState("loading");
    (async () => {
      try {
        const [cRes, rRes] = await Promise.all([
          fetch("/api/costs"),
          fetch(`/api/revenue?channelId=${encodeURIComponent(channelId)}`),
        ]);
        if (cRes.status === 401 || rRes.status === 401) {
          if (alive) setRevState("unauth");
          return;
        }
        const cData = await cRes.json();
        const rData = await rRes.json();
        if (!alive) return;
        if (cData.costs) setCosts(cData.costs);
        if (rData.byVideo) setRevenue(rData.byVideo);
        if (rData.error) {
          setErrMsg(rData.error);
          setRevState("error");
        } else {
          setRevState("ok");
        }
      } catch (e) {
        if (alive) {
          setErrMsg(e instanceof Error ? e.message : "오류");
          setRevState("error");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [status, channelId]);

  const saveCost = useCallback(async (videoId: string, value: number) => {
    setCosts((prev) => ({ ...prev, [videoId]: value }));
    await fetch("/api/costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, cost: value }),
    });
  }, []);

  const showMoney = loggedIn && (revState === "ok" || revState === "error");

  return (
    <div className="space-y-2">
      {/* 로그인 안내 배너 */}
      {!loggedIn && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand-light px-4 py-3 text-sm text-slate-700">
          <span>🔒 로그인하면 <b>수익(₩)</b>과 <b>프리랜서 비용·순이익</b>이 표시됩니다.</span>
          <button
            onClick={() => signIn("google")}
            className="shrink-0 rounded-full bg-brand px-3 py-1 font-semibold text-white hover:bg-brand-dark"
          >
            구글 로그인
          </button>
        </div>
      )}
      {revState === "error" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          수익을 불러오지 못했어요: {errMsg} (계정 연결/권한을 확인하세요)
        </div>
      )}
      {loggedIn && defaultCost > 0 && (
        <p className="px-1 text-xs text-slate-400">
          💸 비용은 <b>쇼츠 영상에만</b> 기본 <b>₩{formatNumber(defaultCost)}</b> 자동 적용(롱폼은 0) · 다른 영상은 그 칸만 고치면 따로 저장돼요
        </p>
      )}

      <div className="scroll-thin overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-card">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">영상</th>
              <th className="px-4 py-3 font-medium">길이</th>
              <th className="px-4 py-3 font-medium">게시일시</th>
              <th className="px-4 py-3 text-right font-medium">조회수</th>
              <th className="px-4 py-3 text-right font-medium">좋아요</th>
              <th className="px-4 py-3 text-right font-medium">댓글</th>
              <th className="px-4 py-3 text-right font-medium">참여율</th>
              <th className="px-4 py-3 text-right font-medium">수익</th>
              <th className="px-4 py-3 text-right font-medium">비용</th>
              <th className="px-4 py-3 text-right font-medium">순이익</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => {
              const er = engagementRate(v.views, v.likes, v.comments);
              const rev = revenue[v.id] || 0;
              // 저장된 개별 비용이 있으면 그걸, 없으면 쇼츠 영상에만 기본 비용 적용 (롱폼은 0)
              const cost = v.id in costs ? costs[v.id] : v.isShort ? defaultCost : 0;
              const profit = rev - cost;
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

                  {/* 수익 */}
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {showMoney ? (
                      <span className="font-semibold text-slate-900">
                        {rev ? "₩" + formatNumber(rev) : "-"}
                      </span>
                    ) : (
                      <Lock />
                    )}
                  </td>

                  {/* 비용 (직접 입력) */}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {loggedIn ? (
                      <CostInput value={cost} onSave={(val) => saveCost(v.id, val)} />
                    ) : (
                      <Lock />
                    )}
                  </td>

                  {/* 순이익 */}
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {showMoney ? (
                      <span className={profit < 0 ? "font-semibold text-red-500" : "font-semibold text-slate-900"}>
                        {profit === 0 ? "-" : "₩" + formatNumber(profit)}
                      </span>
                    ) : (
                      <Lock />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Lock() {
  return <span className="text-slate-300">🔒</span>;
}

function CostInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value || ""));
  useEffect(() => setV(String(value || "")), [value]);

  const commit = () => {
    const num = Number(v.replace(/[^\d]/g, "")) || 0;
    if (num !== value) onSave(num);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      placeholder="0"
      className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right tabular-nums focus:border-brand focus:outline-none"
    />
  );
}
