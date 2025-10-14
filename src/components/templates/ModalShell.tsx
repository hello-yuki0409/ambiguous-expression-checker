import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type ModalShellProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
};

export function ModalShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  headerClassName,
  titleClassName,
  descriptionClassName,
}: ModalShellProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn(contentClassName)}>
        <AlertDialogHeader className={headerClassName}>
          <AlertDialogTitle className={cn(titleClassName)}>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription asChild>
              <div className={cn("text-sm text-muted-foreground", descriptionClassName)}>
                {description}
              </div>
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        {children}

        {footer}
      </AlertDialogContent>
    </AlertDialog>
  );
}
