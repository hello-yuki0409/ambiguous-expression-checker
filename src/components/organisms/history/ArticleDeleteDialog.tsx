import type { ArticleSummary } from "@/lib/api";
import { ConfirmDialog } from "@/components/molecules/dialogs/ConfirmDialog";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { hour12: false });
}

type ArticleDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ArticleSummary | null;
  onConfirm: () => void;
  loading?: boolean;
  errorMessage?: string | null;
};

export function ArticleDeleteDialog({
  open,
  onOpenChange,
  target,
  onConfirm,
  loading = false,
  errorMessage,
}: ArticleDeleteDialogProps) {
  if (!target) return null;

  const title = target.title || "無題の記事";

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${title} を削除しますか？`}
      description="この記事に紐づくバージョン・検出結果がすべて削除されます。この操作は取り消せません。"
      body={
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">対象の記事</div>
          <div className="mt-2 space-y-2">
            <div className="text-sm font-mono text-emerald-700">{title}</div>
            <div className="text-xs text-muted-foreground">
              最終更新: {formatDate(target.updatedAt)}
            </div>
            <div className="text-xs text-muted-foreground">
              最新バージョン: v{(target.latest?.index ?? 0) + 1}
            </div>
          </div>
        </div>
      }
      confirmLabel={loading ? "削除中..." : "削除する"}
      confirmVariant="destructive"
      confirmLoading={loading}
      onConfirm={onConfirm}
      errorMessage={errorMessage}
    />
  );
}
