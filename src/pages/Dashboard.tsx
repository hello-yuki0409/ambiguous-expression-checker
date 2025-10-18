import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/templates/PageShell";
import { DashboardHeader } from "@/components/organisms/dashboard/DashboardHeader";
import { DashboardContentStack } from "@/components/organisms/dashboard/DashboardContentStack";
import { SurfaceCard } from "@/components/atoms/SurfaceCard";
import { EmptyStateMessage } from "@/components/atoms/EmptyStateMessage";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { data, loading, error, handleRefresh, hasContent } = useDashboardData(user);

  const showSkeleton = loading || authLoading;

  return (
    <PageShell>
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
    </PageShell>
  );
}
