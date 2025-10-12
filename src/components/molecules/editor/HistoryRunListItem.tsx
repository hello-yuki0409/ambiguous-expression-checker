import type { RunHistory } from "@/lib/history";
import { cn } from "@/lib/utils";

type HistoryRunListItemProps = {
  entry: RunHistory;
  className?: string;
};

export function HistoryRunListItem({ entry, className }: HistoryRunListItemProps) {
  const formattedDate = new Date(entry.ts).toLocaleString(undefined, { hour12: false });

  // 履歴一覧で繰り返される表示を 1 箇所に集約し、フォーマットの揺れを避ける
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2",
        className
      )}
    >
      <span className="font-medium text-emerald-700">{formattedDate}</span>
      <span className="font-mono text-emerald-800">
        {entry.count}件 / {entry.length}字 / {entry.ms}ms
      </span>
      {entry.topWords.length > 0 && (
        <span className="truncate text-right text-[11px] text-emerald-600">
          {entry.topWords.join(" / ")}
        </span>
      )}
    </li>
  );
}
