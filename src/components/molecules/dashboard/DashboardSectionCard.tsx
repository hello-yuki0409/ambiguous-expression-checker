import type { ReactNode } from "react";
import { SurfaceCard } from "@/components/atoms/SurfaceCard";
import { EmptyStateMessage } from "@/components/atoms/EmptyStateMessage";

type DashboardSectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  contentClassName?: string;
};

export function DashboardSectionCard({
  title,
  subtitle,
  children,
  contentClassName,
}: DashboardSectionCardProps) {
  return (
    <SurfaceCard className="bg-white/80 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-700">{title}</h3>
        {subtitle ? (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
      <div className={`mt-4 ${contentClassName ?? ""}`}>{children}</div>
    </SurfaceCard>
  );
}

export function DashboardEmptyState({ message }: { message: string }) {
  return <EmptyStateMessage>{message}</EmptyStateMessage>;
}
