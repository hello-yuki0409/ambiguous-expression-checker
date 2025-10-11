import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SurfaceCardProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function SurfaceCard<T extends ElementType = "div">({
  as,
  className,
  children,
  ...props
}: SurfaceCardProps<T>) {
  const Component = (as ?? "div") as ElementType;

  // 基本の装飾を集約
  return (
    <Component
      className={cn(
        "rounded-2xl border border-emerald-100 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
