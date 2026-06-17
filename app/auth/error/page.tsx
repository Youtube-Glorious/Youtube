import Link from "next/link";
import { cookies } from "next/headers";
import { auth, isAllowed, REJECTED_EMAIL_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 환경변수 존재 여부만 본다(값은 절대 노출하지 않음). */
function present(name: string): boolean {
  return Boolean(process.env[name] && process.env[name]!.trim());
}

const ERROR_TEXT: Record<string, string> = {
  Configuration:
    "서버 설정 문제입니다. 보통 환경변수가 빠졌을 때 납니다 — 특히 AUTH_SECRET, 그리고 구글 OAuth(AUTH_GOOGLE_ID·AUTH_GOOGLE_SECRET)를 확인하세요.",
  AccessDenied:
    "접근이 거부되었습니다. 로그인한 이메일이 ALLOWED_EMAILS 목록에 없을 수 있어요. (수익은 허용된 이메일만 볼 수 있습니다)",
  Verification: "로그인 링크가 만료되었거나 이미 사용되었습니다. 다시 시도하세요.",
};

/** 이메일 일부만 보이게 가린다: storyXXX@gmail.com → st***@gmail.com */
function maskEmail(e: string): string {
  const [local, domain] = e.split("@");
  if (!local || !domain) return e;
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${"*".repeat(Math.max(1, local.length - head.length))}@${domain}`;
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const { error, email: queryEmail } = await searchParams;
  // 거부 시 lib/auth.ts 가 쿠키에 이메일을 심어줌. 쿼리 파라미터가 비어 있으면 쿠키에서 읽는다.
  const cookieEmail = (await cookies()).get(REJECTED_EMAIL_COOKIE)?.value;
  const attempted = queryEmail || cookieEmail || "";

  // 이미 정상 로그인된 사용자가 이 페이지를 새로고침/히스토리로 다시 보는 흔한 케이스:
  // 거부된 상태가 아님을 명시해 혼란을 막는다.
  const session = await auth();
  const alreadySignedIn = isAllowed(session?.user?.email);
  const code = error || "Default";
  const message =
    ERROR_TEXT[code] || "로그인 중 알 수 없는 오류가 발생했습니다.";

  // 현재 ALLOWED_EMAILS 에 들어 있는 이메일들 (마스킹 후 표시).
  // 사용자가 자기 대시보드라 본인이 넣은 이메일을 알아볼 수 있어야 하고,
  // 동시에 페이지가 공개라 전체 노출은 피하기 위해 부분 마스킹.
  const allowedList = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const allowedMasked = allowedList.map(maskEmail);

  const attemptedNormalized = (attempted || "").trim().toLowerCase();
  const isMismatch =
    code === "AccessDenied" &&
    attemptedNormalized &&
    !allowedList.map((s) => s.toLowerCase()).includes(attemptedNormalized);

  // 수익/로그인 기능에 필요한 환경변수 점검 (값은 보여주지 않고 설정 여부만)
  const checks: { name: string; required: boolean; ok: boolean; hint: string }[] = [
    { name: "AUTH_SECRET", required: true, ok: present("AUTH_SECRET"), hint: "openssl rand -base64 32 로 만든 긴 랜덤 문자열" },
    { name: "AUTH_GOOGLE_ID", required: true, ok: present("AUTH_GOOGLE_ID"), hint: "구글 OAuth 클라이언트 ID" },
    { name: "AUTH_GOOGLE_SECRET", required: true, ok: present("AUTH_GOOGLE_SECRET"), hint: "구글 OAuth 클라이언트 비밀번호" },
    { name: "ALLOWED_EMAILS", required: true, ok: present("ALLOWED_EMAILS"), hint: "접근 허용 이메일(쉼표로 여러 개). 비어 있으면 아무도 로그인 못 함" },
    {
      name: "POSTGRES_URL",
      required: false,
      ok: present("POSTGRES_URL") || present("POSTGRES_PRISMA_URL") || present("DATABASE_URL"),
      hint: "Vercel Postgres 연결. 없으면 토큰 저장·수익 조회가 안 됨",
    },
  ];

  const missingRequired = checks.filter((c) => c.required && !c.ok);

  return (
    <div className="mx-auto max-w-xl space-y-5 py-6">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand">
        ← 홈으로
      </Link>

      {alreadySignedIn && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          ✅ 현재 <b className="font-mono">{session?.user?.email}</b> 로 정상 로그인된 상태입니다.
          아래는 <b>예전 시도</b>의 에러 안내일 뿐이며, 지금은 거부된 상태가 아닙니다.{" "}
          <Link href="/" className="underline">홈으로 가서</Link> 채널 페이지의 수익을 확인하세요.
        </div>
      )}

      <div className="rounded-2xl border border-red-100 bg-red-50/60 p-6">
        <h1 className="text-lg font-bold text-slate-800">로그인 오류</h1>
        <p className="mt-1 text-xs font-mono text-red-400">code: {code}</p>
        <p className="mt-3 text-sm text-slate-700">{message}</p>
      </div>

      {/* AccessDenied 상세: 시도 이메일과 현재 허용 목록을 마스킹해 보여줌 */}
      {code === "AccessDenied" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 text-sm">
          <h2 className="text-sm font-semibold text-amber-900">허용 목록 점검</h2>
          {attempted ? (
            <p className="mt-2 text-slate-700">
              방금 로그인 시도한 이메일:{" "}
              <span className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-900">{attempted}</span>
            </p>
          ) : (
            <p className="mt-2 text-slate-700">로그인한 구글 계정 이메일이 허용 목록에 없습니다.</p>
          )}

          {allowedList.length === 0 ? (
            <p className="mt-3 text-red-700">
              <b>ALLOWED_EMAILS 가 비어 있습니다.</b> 이 상태에서는 누구도 로그인할 수 없습니다.
              Vercel → Settings → Environment Variables 에서 본인 이메일을 추가하세요.
            </p>
          ) : (
            <div className="mt-3 text-slate-700">
              현재 허용된 이메일 ({allowedList.length}개, 일부 마스킹):
              <ul className="mt-1 list-disc pl-5 font-mono text-xs text-slate-600">
                {allowedMasked.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {isMismatch && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-amber-900">
              👉 위 <b>{attempted}</b> 가 허용 목록에 없습니다. Vercel 의 <b>ALLOWED_EMAILS</b> 에{" "}
              <span className="font-mono">{attempted}</span> 를 추가한 뒤 <b>Redeploy</b> 하세요.
              (이미 있는 이메일과 쉼표로 구분: <span className="font-mono">a@x.com,{attempted}</span>)
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold text-slate-500">환경변수 점검 (값은 표시되지 않음)</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {checks.map((c) => (
            <li key={c.name} className="flex items-start gap-2">
              <span className="mt-0.5">{c.ok ? "✅" : c.required ? "❌" : "⚠️"}</span>
              <div>
                <span className="font-mono font-semibold text-slate-800">{c.name}</span>
                {!c.required && <span className="ml-1 text-xs text-slate-400">(선택)</span>}
                {!c.ok && <span className="ml-2 text-xs text-red-500">설정 안 됨</span>}
                <div className="text-xs text-slate-400">{c.hint}</div>
              </div>
            </li>
          ))}
        </ul>

        {missingRequired.length > 0 ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <b>{missingRequired.map((c) => c.name).join(", ")}</b> 이(가) 설정되지 않았습니다.
            Vercel → 프로젝트 → <b>Settings → Environment Variables</b> 에 추가한 뒤 <b>Redeploy</b> 하세요.
            (자세한 값은 README 7장 참고)
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
            필수 환경변수는 모두 설정되어 있습니다. 그래도 오류가 난다면 구글 OAuth <b>리디렉션 URI</b>(
            <span className="font-mono">/api/auth/callback/google</span>)와 동의 화면의 <b>테스트 사용자</b>·범위를 확인하세요.
          </div>
        )}
      </div>

      <div>
        <Link
          href="/"
          className="inline-flex rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          다시 시도
        </Link>
      </div>
    </div>
  );
}
