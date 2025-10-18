import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDashboard, type DashboardResponse } from "@/lib/api";
import type { User } from "firebase/auth";

// カスタムフックス ダッシュボードのデータ取得をぜんぶ肩代わりする縁の下の力持ち
export function useDashboardData(user: User | null) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchDashboard();
      setData(response);
    } catch (err) {
      setError(
        (err as Error).message ?? "ダッシュボードの読み込みに失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const handleRefresh = useCallback(() => {
    if (loading) return;
    setRefreshKey((prev) => prev + 1);
  }, [loading]);

  const hasContent = useMemo(() => {
    if (!data) return false;
    return (
      data.summary.latest !== null ||
      data.scoreTrend.length > 0 ||
      data.categoryTrend.length > 0 ||
      data.frequentPhrases.length > 0
    );
  }, [data]);

  // 返り値にまとめて渡すからページは飾るだけ
  return {
    data,
    loading,
    error,
    handleRefresh,
    hasContent,
  };
}
