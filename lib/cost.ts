import { DEFAULT_COST_PER_VIDEO } from "./channels";

/**
 * 한 영상의 프리랜서 비용(원)을 계산한다.
 * 영상 표 · 요약 카드 · 홈의 채널별 비교가 모두 같은 규칙을 쓰도록 공통화한다.
 *
 * 규칙:
 *  - 비용 미사용 채널(롱폼 등 showCost=false) → 항상 0
 *  - 저장된 개별 비용이 있으면(savedCost 가 숫자) 그 값
 *  - 없으면 쇼츠 영상에만 기본 비용 적용 (롱폼 영상은 0)
 */
export function computeVideoCost(opts: {
  showCost: boolean;
  isShort: boolean;
  /** 저장된 값. 저장된 항목이 없으면 undefined. */
  savedCost?: number;
  defaultCost?: number;
}): number {
  if (!opts.showCost) return 0;
  if (typeof opts.savedCost === "number") return opts.savedCost;
  return opts.isShort ? opts.defaultCost ?? DEFAULT_COST_PER_VIDEO : 0;
}
