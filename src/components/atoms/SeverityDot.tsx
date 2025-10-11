import { cn } from "@/lib/utils";
import type { Finding } from "@/lib/detection";

export type SeverityDotProps = {
  severity: Finding["severity"];
  className?: string;
  size?: "xs" | "sm";
};

export function SeverityDot({
  severity,
  className,
  size = "xs",
}: SeverityDotProps) {
  const baseSize = size === "sm" ? "h-3 w-3" : "h-2 w-2";

  // sev-* サイズだけを柔軟に調整できるようにする便利なやつ
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        baseSize,
        `sev-${severity}`,
        className
      )}
    />
  );
}
