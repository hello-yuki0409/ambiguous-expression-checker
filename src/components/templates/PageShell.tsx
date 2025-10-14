import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PageShellProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
};

export function PageShell({ children, className, containerClassName }: PageShellProps) {
  // ページ全体のグラデーション背景と共通パディングをまとめる
  return (
    <div className={cn("min-h-full bg-gradient-to-br from-emerald-50 via-white to-white", className)}>
      <div
        className={cn(
          "mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8",
          containerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
