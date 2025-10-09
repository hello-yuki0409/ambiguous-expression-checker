import type { DashboardFrequentPhraseEntry } from "@/lib/api";
import { formatDateTime } from "@/lib/formatters";
import {
  DashboardEmptyState,
  DashboardSectionCard,
} from "@/components/molecules/dashboard/DashboardSectionCard";

const CATEGORY_LABELS: Record<string, string> = {
  HEDGING: "推量・断定回避",
  VAGUE: "ぼかし",
  QUANTITY: "数量曖昧",
  RESPONSIBILITY: "責任回避",
  OTHER: "その他",
};

const CATEGORY_BADGES: Record<string, string> = {
  HEDGING: "bg-indigo-100 text-indigo-700",
  VAGUE: "bg-sky-100 text-sky-700",
  QUANTITY: "bg-emerald-100 text-emerald-700",
  RESPONSIBILITY: "bg-amber-100 text-amber-700",
  OTHER: "bg-slate-100 text-slate-700",
};

function formatSeverity(value: number) {
  if (!Number.isFinite(value)) return "-";
  return value.toFixed(1);
}

export function FrequentPhrasesSection({ entries }: { entries: DashboardFrequentPhraseEntry[] }) {
  if (entries.length === 0) {
    return <DashboardEmptyState message="頻出している曖昧表現はまだありません。" />;
  }

  return (
    <DashboardSectionCard
      title="頻出曖昧語 TOP10"
      subtitle="（直近の保存から集計）"
      contentClassName="overflow-x-auto"
    >
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase text-muted-foreground">
              <th className="px-3 py-2">語句</th>
              <th className="px-3 py-2">カテゴリ</th>
              <th className="px-3 py-2 text-right">件数</th>
              <th className="px-3 py-2 text-right">平均重要度</th>
              <th className="px-3 py-2">最終検出日時</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr
                key={`${entry.category}-${entry.matchedText}`}
                className="border-t border-emerald-100 hover:bg-emerald-50/40 even:bg-emerald-50/20"
              >
                <td className="px-3 py-2 font-medium text-slate-900">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                    <span>{entry.matchedText}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">
                  <span
                    className={`rounded-full px-3 py-1 font-medium ${
                      CATEGORY_BADGES[entry.category] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {CATEGORY_LABELS[entry.category] ?? entry.category}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-sm">{entry.totalCount}</td>
                <td className="px-3 py-2 text-right font-mono text-sm">{formatSeverity(entry.severityAvg)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {formatDateTime(entry.lastFoundAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </DashboardSectionCard>
  );
}
