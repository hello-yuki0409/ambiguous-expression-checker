import type { DashboardSummary } from "@/lib/api";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { hour12: false });
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toFixed(2);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }
  const rounded = value.toFixed(1);
  const numeric = Number(rounded);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

function MetricCard({
  title,
  body,
  footer,
}: {
  title: string;
  body: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-emerald-700">{title}</h3>
      <div className="mt-3 space-y-1 text-sm text-slate-800">{body}</div>
      {footer ? (
        <div className="mt-4 border-t border-emerald-100 pt-3 text-xs text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function SummarySection({ summary }: { summary: DashboardSummary }) {
  if (!summary.latest) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-muted-foreground">
        まだ保存されたバージョンがありません。
      </div>
    );
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
        footer={`作成: ${formatDate(latest.createdAt)}`}
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
        footer={previous ? `作成: ${formatDate(previous.createdAt)}` : undefined}
      />

      <MetricCard
        title="差分"
        body={
          diff ? (
            <>
              <p>
                件数: <span className="font-semibold">{diff.countDiff}</span> / {formatPercent(diff.countPercent)}
              </p>
              <p>
                スコア: <span className="font-semibold">{formatScore(diff.scoreDiff)}</span> / {formatPercent(diff.scorePercent)}
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
