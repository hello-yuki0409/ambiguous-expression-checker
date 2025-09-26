import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button-variants";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: VariantProps<typeof buttonVariants>["variant"];
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  body,
  confirmLabel,
  cancelLabel = "キャンセル",
  confirmVariant = "destructive",
  confirmLoading = false,
  confirmDisabled = false,
  errorMessage,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="space-y-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-slate-900">
            {title}
          </AlertDialogTitle>
          {description ? (
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground">{description}</div>
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        {body ? <div className="space-y-3 text-sm text-slate-700">{body}</div> : null}

        {errorMessage ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <AlertDialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              {cancelLabel}
            </Button>
          </AlertDialogCancel>

          <Button
            type="button"
            variant={confirmVariant}
            className="min-w-[110px]"
            disabled={confirmDisabled || confirmLoading}
            onClick={(event) => {
              event.preventDefault();
              if (confirmDisabled || confirmLoading) return;
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
