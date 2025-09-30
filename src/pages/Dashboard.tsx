import { useEffect, useMemo, useState } from "react";
import { fetchDashboard, type DashboardResponse } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { SummarySection } from "@/components/organisms/dashboard/SummarySection";
import { ScoreTrendSection } from "@/components/organisms/dashboard/ScoreTrendSection";
import { CategoryTrendSection } from "@/components/organisms/dashboard/CategoryTrendSection";
import { FrequentPhrasesSection } from "@/components/organisms/dashboard/FrequentPhrasesSection";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  const handleRefresh = () => {
    if (loading) return;
    setRefreshKey((prev) => prev + 1);
  };

  const showSkeleton = loading || authLoading;
  const hasContent = useMemo(() => {
    if (!data) return false;
    return (
      data.summary.latest !== null ||
      data.scoreTrend.length > 0 ||
      data.categoryTrend.length > 0 ||
      data.frequentPhrases.length > 0
    );
  }, [data]);

  return (
    <div className="min-h-full bg-gradient-to-br from-emerald-50 via-white to-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">
              ダッシュボード
            </h1>
            <p className="text-sm text-muted-foreground">
              曖昧度スコアの推移や頻出語句を振り返り、改善状況を把握しましょう。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? "更新中..." : "最新の情報に更新"}
            </Button>
          </div>
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
            {!hasContent ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-muted-foreground">
                記事を保存すると履歴が集計されます。
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
