import type { DashboardFrequentPhraseEntry } from "@/lib/api";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { hour12: false });
}

function formatSeverity(value: number) {
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(1);
}

export function FrequentPhrasesSection({ entries }: { entries: DashboardFrequentPhraseEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-muted-foreground">
        頻出している曖昧表現はまだありません。
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-700">頻出曖昧語 TOP10</h3>
        <span className="text-xs text-muted-foreground">（直近の保存から集計）</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">語句</th>
              <th className="px-3 py-2">カテゴリ</th>
              <th className="px-3 py-2 text-right">件数</th>
              <th className="px-3 py-2 text-right">平均Severity</th>
              <th className="px-3 py-2">最終検出日時</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`${entry.category}-${entry.matchedText}`} className="border-t border-emerald-100">
                <td className="px-3 py-2 font-medium text-slate-900">{entry.matchedText}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{entry.category}</td>
                <td className="px-3 py-2 text-right font-mono text-sm">{entry.totalCount}</td>
                <td className="px-3 py-2 text-right font-mono text-sm">{formatSeverity(entry.severityAvg)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(entry.lastFoundAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
