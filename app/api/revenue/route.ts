import { NextRequest, NextResponse } from "next/server";
import { auth, isAllowed } from "@/lib/auth";
import { getChannelRevenueUSD } from "@/lib/analytics";
import { getUsdKrw } from "@/lib/fx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAllowed(session?.user?.email)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const channelId = req.nextUrl.searchParams.get("channelId");
  if (!channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }
  try {
    const [rev, rate] = await Promise.all([getChannelRevenueUSD(channelId), getUsdKrw()]);
    const byVideo: Record<string, number> = {};
    let total = 0;
    for (const [vid, usd] of Object.entries(rev.byVideo)) {
      const krw = Math.round(usd * rate);
      byVideo[vid] = krw;
      total += krw;
    }

    // 수익이 0/비어 있을 때 "왜 안 나오는지"를 사용자에게 알려준다.
    let note: string | undefined;
    if (rev.accounts === 0) {
      note = "연결된 구글 계정이 없습니다. 채널을 소유한 계정으로 로그인하세요.";
    } else if (!rev.matchedOwner) {
      note = rev.apiError
        ? `이 채널의 수익 권한을 확인하지 못했어요 (${rev.apiError}). 채널을 소유한 계정으로 로그인했는지, 수익 권한(yt-analytics-monetary)에 동의했는지 확인하세요.`
        : "이 채널을 소유한 계정이 연결되어 있지 않습니다. 해당 계정으로 로그인하세요.";
    } else if (total === 0) {
      note =
        "소유 계정은 확인됐지만 수익 데이터가 0입니다. 채널이 아직 수익 창출(YouTube 파트너 프로그램) 상태가 아니거나, 해당 기간 수익이 없을 수 있어요.";
    }

    return NextResponse.json({ byVideo, total, rate, note });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
