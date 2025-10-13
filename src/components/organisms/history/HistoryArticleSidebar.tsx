import { SurfaceCard } from "@/components/atoms/SurfaceCard";
import { Button } from "@/components/ui/button";
import { ArticleSummaryCard } from "@/components/molecules/history/ArticleSummaryCard";
import type { ArticleSummary, CheckRunSummary } from "@/lib/api";

export type HistoryArticleSidebarProps = {
  summaries: ArticleSummary[];
  loading: boolean;
  errorMessage: string | null;
  selectedArticleId: string | null;
  onReload: () => void;
  onSelect: (id: string) => void;
  onDelete: (summary: ArticleSummary) => void;
  deletingArticleId: string | null;
};

function computeTrend(
  latest?: CheckRunSummary | null,
  previous?: CheckRunSummary | null
) {
  if (!latest || !previous) return null;
  const countDiff = latest.totalCount - previous.totalCount;
  const countPercent =
    previous.totalCount > 0 ? (countDiff / previous.totalCount) * 100 : null;
  const scoreDiff = latest.aimaiScore - previous.aimaiScore;
  const scorePercent =
    previous.aimaiScore !== 0 ? (scoreDiff / previous.aimaiScore) * 100 : null;
  return { countDiff, countPercent, scoreDiff, scorePercent };
}

export function HistoryArticleSidebar({
  summaries,
  loading,
  errorMessage,
  selectedArticleId,
  onReload,
  onSelect,
  onDelete,
  deletingArticleId,
}: HistoryArticleSidebarProps) {
  // 記事一覧の表示と操作を一箇所にまとめる
  return (
    <SurfaceCard as="section" className="bg-white/80 p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-emerald-700">記事一覧</h2>
        <Button
          variant="outline"
          size="sm"
          className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          onClick={onReload}
          disabled={loading}
        >
          {loading ? "更新中..." : "再読み込み"}
        </Button>
      </div>
      {errorMessage && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {errorMessage}
        </p>
      )}
      {!loading && summaries.length === 0 && !errorMessage && (
        <p className="mt-3 text-xs text-muted-foreground">
          まだ保存された記事がありません。
        </p>
      )}
      <div className="mt-4 space-y-3">
        {summaries.map((item) => (
          <ArticleSummaryCard
            key={item.id}
            article={item}
            isActive={selectedArticleId === item.id}
            latestRun={item.latest?.checkRun}
            previousRun={item.previous?.checkRun}
            trend={computeTrend(item.latest?.checkRun, item.previous?.checkRun)}
            onSelect={() => onSelect(item.id)}
            onDelete={() => onDelete(item)}
            deleting={deletingArticleId === item.id}
          />
        ))}
      </div>
    </SurfaceCard>
  );
}
