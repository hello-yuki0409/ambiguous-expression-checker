import type { DashboardSummary } from "@/lib/api";
import {
  formatDateTime,
  formatPercent,
  formatScore,
} from "@/lib/formatters";
import { MetricCard } from "@/components/molecules/dashboard/MetricCard";
import { DashboardEmptyState } from "@/components/molecules/dashboard/DashboardSectionCard";

function diffTextClass(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "text-muted-foreground";
  }
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-emerald-600";
  return "text-muted-foreground";
}

export function SummarySection({ summary }: { summary: DashboardSummary }) {
  if (!summary.latest) {
    return <DashboardEmptyState message="まだ保存されたバージョンがありません。" />;
  }

  const { latest, previous, diff } = summary;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        title="最新バージョン"
        body={
          <>
            <p className="text-lg font-semibold text-slate-900">
              {latest.articleTitle || "無題の記事"} / v{latest.index + 1}
            </p>
            <p>曖昧度スコア: {formatScore(latest.aimaiScore)}</p>
            <p>曖昧件数: {latest.totalCount}</p>
            <p>文字数: {latest.charLength}</p>
          </>
        }
        footer={`作成: ${formatDateTime(latest.createdAt)}`}
        highlight
      />

      <MetricCard
        title="前回バージョン"
        body={
          previous ? (
            <>
              <p className="text-lg font-semibold text-slate-900">
                {previous.articleTitle || "無題の記事"} / v{previous.index + 1}
              </p>
              <p>曖昧度スコア: {formatScore(previous.aimaiScore)}</p>
              <p>曖昧件数: {previous.totalCount}</p>
              <p>文字数: {previous.charLength}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">比較対象がありません</p>
          )
        }
        footer={previous ? `作成: ${formatDateTime(previous.createdAt)}` : undefined}
      />

      <MetricCard
        title="差分"
        body={
          diff ? (
            <>
              <p className={`font-semibold ${diffTextClass(diff.countDiff)}`}>
                件数: {diff.countDiff > 0 ? `+${diff.countDiff}` : diff.countDiff}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatPercent(diff.countPercent)}
                </span>
              </p>
              <p className={`font-semibold ${diffTextClass(diff.scoreDiff)}`}>
                スコア: {formatScore(diff.scoreDiff)}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatPercent(diff.scorePercent)}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">差分データがありません</p>
          )
        }
      />
    </div>
  );
}
