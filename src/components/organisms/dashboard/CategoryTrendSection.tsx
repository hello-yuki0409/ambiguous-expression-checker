import type { DashboardCategoryTrendEntry } from "@/lib/api";

const CATEGORY_ORDER = [
  "HEDGING",
  "VAGUE",
  "QUANTITY",
  "RESPONSIBILITY",
  "OTHER",
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { hour12: false });
}

export function CategoryTrendSection({ entries }: { entries: DashboardCategoryTrendEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-muted-foreground">
        カテゴリ別の件数はまだありません。
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-700">カテゴリ別件数</h3>
        <span className="text-xs text-muted-foreground">（直近 {entries.length} 件）</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">バージョン</th>
              <th className="px-3 py-2">日時</th>
              {CATEGORY_ORDER.map((category) => (
                <th key={category} className="px-3 py-2 text-right">
                  {category}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.versionId} className="border-t border-emerald-100">
                <td className="px-3 py-2 font-mono text-sm text-emerald-800">{entry.versionId.slice(0, 8)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(entry.createdAt)}</td>
                {CATEGORY_ORDER.map((category) => (
                  <td key={category} className="px-3 py-2 text-right font-mono text-sm">
                    {entry.counts[category] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
