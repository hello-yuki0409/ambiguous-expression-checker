import { Button } from "@/components/ui/button";
import { MetricPill } from "@/components/atoms/MetricPill";
import { formatDateTime, formatScore } from "@/lib/formatters";
import type { VersionSummary } from "@/lib/api";

export type VersionHistoryCardProps = {
  version: VersionSummary;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  disableActions?: boolean;
};

export function VersionHistoryCard({
  version,
  selected,
  onToggle,
  onDelete,
  disableActions = false,
}: VersionHistoryCardProps) {
  const run = version.checkRun;
  const containerClass = selected
    ? "border-emerald-400 bg-gradient-to-r from-emerald-50 to-white shadow-sm"
    : "border-transparent bg-white/80 hover:border-emerald-200";

  // バージョンの概要表示とアクションをまとめて扱い、親側でロジックだけ維持する
  return (
    <div className={`rounded-xl border px-4 py-3 transition-all ${containerClass}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            v{version.index + 1} {version.title || ""}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDateTime(version.createdAt)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <MetricPill>件数 {run?.totalCount ?? 0}</MetricPill>
          <MetricPill>スコア {formatScore(run?.aimaiScore)}</MetricPill>
          {run && <MetricPill>文字数 {run.charLength}</MetricPill>}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={selected ? "secondary" : "outline"}
            size="sm"
            className={
              selected
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            }
            onClick={onToggle}
            disabled={disableActions}
          >
            {selected ? "選択解除" : "比較へ追加"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={onDelete}
            disabled={disableActions}
          >
            {disableActions ? "削除中..." : "削除"}
          </Button>
        </div>
      </div>
    </div>
  );
}
