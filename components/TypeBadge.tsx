import { ChannelType } from "@/lib/channels";

export function TypeBadge({ type }: { type: ChannelType }) {
  const isShorts = type === "쇼츠";
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold " +
        (isShorts
          ? "bg-shorts text-shorts-ink"
          : "bg-brand text-white")
      }
    >
      {type}
    </span>
  );
}
