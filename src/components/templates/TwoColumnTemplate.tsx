import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TwoColumnTemplateProps = {
  main: ReactNode;
  side: ReactNode;
  className?: string;
  mainWrapperClassName?: string;
  sideWrapperClassName?: string;
};

export function TwoColumnTemplate({
  main,
  side,
  className,
  mainWrapperClassName,
  sideWrapperClassName,
}: TwoColumnTemplateProps) {
  // 二列レイアウトのグリッドをテンプレート化し、左右カラムの構成を共通化
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]", className)}>
      <div className={cn("min-w-0", mainWrapperClassName)}>{main}</div>
      <div className={cn("min-w-0", sideWrapperClassName)}>{side}</div>
    </div>
  );
}
