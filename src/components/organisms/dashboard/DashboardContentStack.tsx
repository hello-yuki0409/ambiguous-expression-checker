import { SummarySection } from "@/components/organisms/dashboard/SummarySection";
import { ScoreTrendSection } from "@/components/organisms/dashboard/ScoreTrendSection";
import { CategoryTrendSection } from "@/components/organisms/dashboard/CategoryTrendSection";
import { FrequentPhrasesSection } from "@/components/organisms/dashboard/FrequentPhrasesSection";
import { EmptyStateMessage } from "@/components/atoms/EmptyStateMessage";
import type {
  DashboardCategoryTrendEntry,
  DashboardFrequentPhraseEntry,
  DashboardResponse,
  DashboardScoreTrendEntry,
} from "@/lib/api";

export type DashboardContentStackProps = {
  summary: DashboardResponse["summary"];
  scoreTrend: DashboardScoreTrendEntry[];
  categoryTrend: DashboardCategoryTrendEntry[];
  frequentPhrases: DashboardFrequentPhraseEntry[];
  hasContent: boolean;
};

export function DashboardContentStack({
  summary,
  scoreTrend,
  categoryTrend,
  frequentPhrases,
  hasContent,
}: DashboardContentStackProps) {
  // ダッシュボードのメインセクション構成をまとめ、ページ側の JSX を整理する
  return (
    <div className="space-y-6">
      <SummarySection summary={summary} />
      <ScoreTrendSection entries={scoreTrend} />
      <CategoryTrendSection entries={categoryTrend} />
      <FrequentPhrasesSection entries={frequentPhrases} />
      {!hasContent ? (
        <EmptyStateMessage>
          記事を保存すると履歴が集計されます。
        </EmptyStateMessage>
      ) : null}
    </div>
  );
}
