# 유튜브 채널 대시보드 (Next.js)

내 유튜브 채널들의 **구독자 · 조회수 · 영상별 성과(조회/좋아요/댓글/참여율)** 를 한눈에 보는 웹 대시보드입니다.
채널마다 개별 페이지로 나뉘며, **Vercel에 배포**해서 인터넷 주소로 접속할 수 있습니다.

- 프레임워크: **Next.js 16** (App Router) + React 19 + TypeScript + Tailwind CSS
- 데이터: **YouTube Data API v3** (서버에서 호출 → API 키는 브라우저에 노출되지 않음)
- 갱신: 1시간마다 자동 (ISR `revalidate`)

> ℹ️ 이 버전은 **공개 지표**만 다룹니다. 수익(₩) 자동 집계는 구글 로그인(OAuth) 서버가 필요해 V2로 분리했습니다.
> 기존 구글 시트(수익 자동) 버전은 `apps-script/` 폴더에 보관되어 있습니다.

---

## 1. YouTube API 키 발급 (1회, 무료)

1. [Google Cloud Console](https://console.cloud.google.com) 접속 → 프로젝트 생성(또는 선택)
2. **API 및 서비스 → 라이브러리** → "YouTube Data API v3" 검색 → **사용 설정**
3. **API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → API 키**
4. 만들어진 키를 복사 (선택: 키 제한에서 "YouTube Data API v3" 만 허용하면 더 안전)

## 2. 로컬에서 실행

```bash
npm install

# 환경변수 파일 만들기
cp .env.example .env.local
#  → .env.local 을 열어 YOUTUBE_API_KEY=발급받은키  형태로 입력

npm run dev
# http://localhost:3000 접속
```

## 3. Vercel 배포

1. 이 저장소를 GitHub에 올린다 (이미 되어 있음).
2. [vercel.com](https://vercel.com) → **Add New → Project** → 이 깃허브 저장소 선택 → Import.
3. **Environment Variables** 에 추가:
   - Name: `YOUTUBE_API_KEY`
   - Value: 발급받은 키
4. **Deploy** 클릭 → 잠시 후 `https://<프로젝트>.vercel.app` 주소가 나옵니다.

> 환경변수를 나중에 바꾸면 **재배포(Redeploy)** 해야 반영됩니다.

---

## 4. 내 채널 바꾸기

`lib/channels.ts` 의 `CHANNELS` 배열만 고치면 됩니다.

```ts
export const CHANNELS: ChannelConfig[] = [
  { id: "shorts-master", name: "쇼츠석사_Fun", type: "쇼츠", query: "쇼츠석사_Fun" },
  // id: 주소에 쓰일 영문, name: 표시 이름, type: "쇼츠"|"롱폼"
];
```

- 정확도를 높이려면 `query`(이름 검색) 대신 **`handle: "@핸들"`** 또는 **`channelId: "UC..."`** 를 쓰세요.
- 채널 ID는 채널 페이지 → 더보기 → 공유 → 채널 ID 복사 로 확인할 수 있습니다.

---

## 5. 폴더 구조

```
app/
  layout.tsx            전체 레이아웃 (헤더/푸터)
  page.tsx              홈 — 전체 요약 + 채널 카드 그리드
  channel/[id]/page.tsx 채널 상세 — KPI + 조회수 TOP + 영상 표
  not-found.tsx         404
lib/
  channels.ts           ⭐ 채널 목록 설정 (여기를 주로 수정)
  youtube.ts            YouTube API 호출 (서버 전용)
  format.ts             숫자/날짜 표시 헬퍼
components/
  ChannelCard / StatCard / TypeBadge / BarList / VideoTable
apps-script/            (이전) 구글 시트 + 수익 자동 버전 보관
```

## 6. 자주 만나는 문제

- **데이터가 안 나오고 노란 경고**: `YOUTUBE_API_KEY` 미설정. 환경변수 확인 후 재실행/재배포.
- **403 quotaExceeded**: 하루 무료 할당량(기본 10,000) 초과. 다음 날 초기화되며, 채널/영상 수를 줄이면 절약됩니다.
- **엉뚱한 채널이 잡힘**: 이름 검색이라 그럴 수 있어요. `channels.ts` 에서 `handle` 또는 `channelId` 로 바꾸세요.

## 7. V2 아이디어

- 수익(₩) 자동 집계 (Google OAuth + YouTube Analytics API)
- 조회수 추이 그래프(일자별 스냅샷 저장)
- 채널 비교 뷰, CSV 내보내기
