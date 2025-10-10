import type { ReactNode } from "react";

type StatusChipProps = {
  active: boolean;
  children: ReactNode;
};

export function StatusChip({ active, children }: StatusChipProps) {
  const baseClass =
    "px-3 py-1 rounded-full border text-xs font-medium transition-colors";
  const activeClass = "border-emerald-500 bg-emerald-50 text-emerald-700";
  const inactiveClass = "border-transparent bg-muted/40 text-muted-foreground";

  // ここでクラスを集約
  const className = `${baseClass} ${active ? activeClass : inactiveClass}`;

  return <span className={className}>{children}</span>;
}
