import type { Finding } from "@/lib/detection";

const CATEGORY_LABELS: Record<Finding["category"], string> = {
  HEDGING: "推量・断定回避",
  VAGUE: "ぼかし",
  QUANTITY: "数量曖昧",
  RESPONSIBILITY: "責任回避",
  OTHER: "その他",
};

type FindingsListItemProps = {
  finding: Finding;
  onJump?: (offset: number) => void;
  onSelect?: (finding: Finding) => void;
  index?: number;
};

export function FindingsListItem({
  finding,
  onJump,
  onSelect,
  index,
}: FindingsListItemProps) {
  return (
    <div
      className="w-full rounded-md border p-2 transition hover:bg-muted/40 flex items-center justify-between gap-2"
      key={`${finding.start}-${index ?? 0}`}
    >
      <button
        className="flex-1 text-left"
        onClick={() => onJump?.(finding.start)}
        title={finding.reason ?? "曖昧な表現"}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full sev-${finding.severity}`}
          />
          <span className="font-mono text-[11px] opacity-70">
            [{CATEGORY_LABELS[finding.category] ?? finding.category}]
          </span>
          <span className="truncate">{finding.text}</span>
        </div>
      </button>
      <button
        className="rounded border px-2 py-1 text-xs hover:bg-muted"
        onClick={() => onSelect?.(finding)}
      >
        候補
      </button>
    </div>
  );
}
