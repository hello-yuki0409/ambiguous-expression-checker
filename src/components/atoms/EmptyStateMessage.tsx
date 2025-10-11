import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateMessageProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function EmptyStateMessage<T extends ElementType = "div">({
  as,
  className,
  children,
  ...props
}: EmptyStateMessageProps<T>) {
  const Component = (as ?? "div") as ElementType;

  // 空状態で繰り返し使うビジュアルをここで統一する
  return (
    <Component
      className={cn(
        "rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-6 text-sm text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
