import type { ArticleSummary, CheckRunSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  formatPercent,
  formatScore,
} from "@/lib/formatters";

type TrendInfo = {
  countDiff: number;
  countPercent: number | null;
  scoreDiff: number;
  scorePercent: number | null;
} | null;

type ArticleSummaryCardProps = {
  article: ArticleSummary;
  isActive: boolean;
  latestRun: CheckRunSummary | null | undefined;
  previousRun: CheckRunSummary | null | undefined;
  trend: TrendInfo;
  onSelect: () => void;
  onDelete: () => void;
  deleting?: boolean;
};

function chipClass(isActive: boolean) {
  return `px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
    isActive
      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
      : "border-transparent bg-muted/40 text-muted-foreground"
  }`;
}

function trendClass(value: number) {
  if (value < 0) return "text-emerald-600";
  if (value > 0) return "text-red-600";
  return "text-muted-foreground";
}

export function ArticleSummaryCard({
  article,
  isActive,
  latestRun,
  previousRun,
  trend,
  onSelect,
  onDelete,
  deleting = false,
}: ArticleSummaryCardProps) {
  return (
    <div className="relative">
      <button
        type="button"
        className={`w-full rounded-xl border p-4 text-left transition-all ${
          isActive
            ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-white shadow-md"
            : "border-transparent bg-white/70 hover:border-emerald-200 hover:bg-white"
        }`}
        onClick={onSelect}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {article.title || "無題の記事"}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              最終更新: {formatDateTime(article.updatedAt)}
            </div>
          </div>
          <span className={chipClass(isActive)}>
            v{(article.latest?.index ?? 0) + 1}
          </span>
        </div>

        {latestRun && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600">
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
              <div className="opacity-80">曖昧度スコア</div>
              <div className="text-sm">{formatScore(latestRun.aimaiScore)}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
              <div className="opacity-80">曖昧件数</div>
              <div className="text-sm">{latestRun.totalCount}</div>
            </div>
          </div>
        )}

        {trend && previousRun && latestRun && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className={`rounded-lg border px-3 py-2 ${trendClass(trend.countDiff)}`}>
              <div className="opacity-70">件数</div>
              <div className="font-mono">
                {previousRun.totalCount} → {latestRun.totalCount}
              </div>
              <div>{formatPercent(trend.countPercent)}</div>
            </div>
            <div className={`rounded-lg border px-3 py-2 ${trendClass(trend.scoreDiff)}`}>
              <div className="opacity-70">スコア</div>
              <div className="font-mono">
                {formatScore(previousRun.aimaiScore)} → {" "}
                {formatScore(latestRun.aimaiScore)}
              </div>
              <div>{formatPercent(trend.scorePercent, 1)}</div>
            </div>
          </div>
        )}
      </button>

      <Button
        variant="outline"
        size="sm"
        className="absolute right-4 top-4 border-red-200 text-red-600 hover:bg-red-50"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        disabled={deleting}
      >
        {deleting ? "削除中..." : "記事削除"}
      </Button>
    </div>
  );
}
