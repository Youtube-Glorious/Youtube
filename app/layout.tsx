import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "유튜브 채널 대시보드",
  description: "내 유튜브 채널들의 구독자·조회수·영상 성과를 한눈에",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-10 border-b border-white/40 bg-gradient-to-r from-brand to-brand-dark text-white shadow-card">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <span className="text-2xl">📊</span>
              유튜브 채널 대시보드
            </Link>
            <span className="hidden text-sm text-white/80 sm:block">공개 지표 · 자동 집계</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-5 pb-10 pt-4 text-center text-xs text-slate-400">
          YouTube Data API · 1시간마다 자동 갱신
        </footer>
      </body>
    </html>
  );
}
