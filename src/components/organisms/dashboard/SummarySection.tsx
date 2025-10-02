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

function diffTextClass(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "text-muted-foreground";
  }
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-emerald-600";
  return "text-muted-foreground";
}

function MetricCard({
  title,
  body,
  footer,
  highlight = false,
}: {
  title: string;
  body: React.ReactNode;
  footer?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition ${
        highlight
          ? "border-emerald-300 bg-gradient-to-br from-emerald-100/70 via-white to-white"
          : "border-emerald-100 bg-white/80"
      }`}
    >
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
        footer={previous ? `作成: ${formatDate(previous.createdAt)}` : undefined}
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
