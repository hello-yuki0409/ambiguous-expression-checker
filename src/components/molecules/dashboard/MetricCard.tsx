import type { ReactNode } from "react";

type MetricCardProps = {
  title: string;
  body: ReactNode;
  footer?: ReactNode;
  highlight?: boolean;
};

export function MetricCard({
  title,
  body,
  footer,
  highlight = false,
}: MetricCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition ${
        highlight
          ? "border-emerald-300 bg-gradient-to-br from-emerald-100/70 via-white to-white"
          : "border-emerald-100 bg-white/80"
      }`}
    >
      <h3 className="text-sm font-semibold text-emerald-700">{title}</h3>
      <div className="mt-3 space-y-1 text-sm text-slate-800">{body}</div>
      {footer ? (
        <div className="mt-4 border-t border-emerald-100 pt-3 text-xs text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
