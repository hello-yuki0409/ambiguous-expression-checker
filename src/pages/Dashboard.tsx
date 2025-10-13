import { useEffect, useMemo, useState } from "react";
import { fetchDashboard, type DashboardResponse } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { SurfaceCard } from "@/components/atoms/SurfaceCard";
import { EmptyStateMessage } from "@/components/atoms/EmptyStateMessage";
import { DashboardHeader } from "@/components/organisms/dashboard/DashboardHeader";
import { DashboardContentStack } from "@/components/organisms/dashboard/DashboardContentStack";

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
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <DashboardHeader loading={loading} onRefresh={handleRefresh} />

        {showSkeleton ? (
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-2xl bg-emerald-100/60" />
            <div className="h-40 animate-pulse rounded-2xl bg-emerald-100/60" />
            <div className="h-48 animate-pulse rounded-2xl bg-emerald-100/60" />
          </div>
        ) : error ? (
          <SurfaceCard className="border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-none">
            {error}
          </SurfaceCard>
        ) : !data ? (
          <EmptyStateMessage>
            データを取得できませんでした。
          </EmptyStateMessage>
        ) : (
          <DashboardContentStack
            summary={data.summary}
            scoreTrend={data.scoreTrend}
            categoryTrend={data.categoryTrend}
            frequentPhrases={data.frequentPhrases}
            hasContent={hasContent}
          />
        )}
      </div>
    </div>
  );
}
