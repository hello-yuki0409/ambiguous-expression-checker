import type { DashboardScoreTrendEntry } from "@/lib/api";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { hour12: false });
}

export function ScoreTrendSection({ entries }: { entries: DashboardScoreTrendEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-muted-foreground">
        表示できるスコア推移がありません。
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-700">曖昧度スコアの推移</h3>
        <span className="text-xs text-muted-foreground">（直近 {entries.length} 件）</span>
      </div>
      <div className="mt-4 space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.runId}
            className="flex flex-col gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-sm md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className="font-semibold text-slate-900">
                {entry.articleTitle || "無題の記事"} / v{entry.index + 1}
              </p>
              <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-mono text-emerald-800">
              <span className="rounded-lg bg-white px-3 py-1">スコア {entry.aimaiScore.toFixed(2)}</span>
              <span className="rounded-lg bg-white px-3 py-1">件数 {entry.totalCount}</span>
              <span className="rounded-lg bg-white px-3 py-1">文字数 {entry.charLength}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
