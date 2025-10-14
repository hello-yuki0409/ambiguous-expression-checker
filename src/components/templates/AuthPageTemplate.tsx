import type { ReactNode } from "react";
import { PageShell } from "@/components/templates/PageShell";
import { cn } from "@/lib/utils";

export type AuthPageTemplateProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  cardClassName?: string;
};

export function AuthPageTemplate({
  title,
  description,
  children,
  footer,
  cardClassName,
}: AuthPageTemplateProps) {
  return (
    <PageShell className="flex min-h-screen items-center justify-center p-6">
      <div
        className={cn(
          "w-full max-w-md rounded-2xl border border-emerald-100 bg-white/80 p-8 shadow-lg backdrop-blur",
          cardClassName
        )}
      >
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-emerald-700">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {children}

        {footer}
      </div>
    </PageShell>
  );
}
