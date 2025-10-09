import type { ReactNode } from "react";

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
    <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-700">{title}</h3>
        {subtitle ? (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </div>
      <div className={`mt-4 ${contentClassName ?? ""}`}>{children}</div>
    </div>
  );
}

export function DashboardEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
