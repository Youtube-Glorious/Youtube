/**
 * 관리할 채널 목록.
 *
 * - id        : URL에 쓰이는 영문 식별자 (예: /channel/sayeon)
 * - name      : 화면에 표시할 이름
 * - type      : "쇼츠" | "롱폼" (배지 색 구분용)
 * - handle    : '@핸들' 이 있으면 가장 정확. (선택)
 * - channelId : 'UC...' 채널 ID 가 있으면 제일 정확. (선택)
 * - query     : handle/channelId 가 없을 때 이 이름으로 검색해서 찾음.
 *
 * 👉 더 정확하게 하고 싶으면 각 채널의 handle 이나 channelId 를 채워 넣으세요.
 */

export type ChannelType = "쇼츠" | "롱폼";

/** 영상 1개당 기본 프리랜서 비용(원). 영상별로 다르면 화면에서 그 칸만 수정 가능. */
export const DEFAULT_COST_PER_VIDEO = 12000;

export interface ChannelConfig {
  id: string;
  name: string;
  type: ChannelType;
  handle?: string;
  channelId?: string;
  query?: string;
  /** 이 채널의 영상당 기본 비용(원). 없으면 DEFAULT_COST_PER_VIDEO 사용 */
  costPerVideo?: number;
}

export const CHANNELS: ChannelConfig[] = [
  { id: "shorts-master", name: "쇼츠석사_Fun", type: "쇼츠", handle: "@쇼츠석사_Fun", costPerVideo: 12000 },
  { id: "sayeonjarak",   name: "사연자락",     type: "롱폼", handle: "@사연자락",     costPerVideo: 12000 },
];

export function getChannelConfig(id: string): ChannelConfig | undefined {
  return CHANNELS.find((c) => c.id === id);
}
