import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type MetricPillProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function MetricPill<T extends ElementType = "div">({
  as,
  className,
  children,
  ...props
}: MetricPillProps<T>) {
  const Component = (as ?? "div") as ElementType;

  // 小さなメトリクス表示の装飾を共通化し、色味や余白がぶれないようにしている
  return (
    <Component
      className={cn(
        "rounded-lg bg-emerald-500/10 px-3 py-2 text-emerald-700",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
