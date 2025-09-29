import { useEffect, useState } from "react";
import { fetchDashboard, type DashboardResponse } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { SummarySection } from "@/components/organisms/dashboard/SummarySection";
import { ScoreTrendSection } from "@/components/organisms/dashboard/ScoreTrendSection";
import { CategoryTrendSection } from "@/components/organisms/dashboard/CategoryTrendSection";
import { FrequentPhrasesSection } from "@/components/organisms/dashboard/FrequentPhrasesSection";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      return;
    }
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchDashboard();
        if (cancelled) return;
        setData(response);
      } catch (err) {
        if (cancelled) return;
        setError(
          (err as Error).message ?? "ダッシュボードの読み込みに失敗しました"
        );
      } finally {
        // try/catch 内で return したらダメでした。
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const showSkeleton = loading || authLoading;

  return (
    <div className="min-h-full bg-gradient-to-br from-emerald-50 via-white to-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            ダッシュボード
          </h1>
          <p className="text-sm text-muted-foreground">
            曖昧度スコアの推移や頻出語句を振り返りましょう。
          </p>
        </header>

        {showSkeleton ? (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-2xl bg-emerald-100/60" />
            <div className="h-40 animate-pulse rounded-2xl bg-emerald-100/60" />
            <div className="h-48 animate-pulse rounded-2xl bg-emerald-100/60" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        ) : !data ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-muted-foreground">
            データを取得できませんでした。
          </div>
        ) : (
          <div className="space-y-6">
            <SummarySection summary={data.summary} />
            <ScoreTrendSection entries={data.scoreTrend} />
            <CategoryTrendSection entries={data.categoryTrend} />
            <FrequentPhrasesSection entries={data.frequentPhrases} />
          </div>
        )}
      </div>
    </div>
  );
}
