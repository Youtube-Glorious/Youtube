import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-card">
      <h1 className="text-2xl font-extrabold text-slate-900">404</h1>
      <p className="mt-2 text-sm text-slate-500">찾는 채널이 없어요.</p>
      <Link href="/" className="mt-4 inline-block font-semibold text-brand hover:underline">
        ← 전체 채널로
      </Link>
    </div>
  );
}
