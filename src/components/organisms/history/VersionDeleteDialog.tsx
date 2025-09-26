import type { VersionSummary } from "@/lib/api";
import { ConfirmDialog } from "@/components/molecules/dialogs/ConfirmDialog";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { hour12: false });
}

export type VersionDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: VersionSummary | null;
  onConfirm: () => void;
  loading?: boolean;
  errorMessage?: string | null;
};

export function VersionDeleteDialog({
  open,
  onOpenChange,
  target,
  onConfirm,
  loading = false,
  errorMessage,
}: VersionDeleteDialogProps) {
  if (!target) {
    return null;
  }

  const versionLabel = `v${target.index + 1}`;
  const titleText = `${versionLabel} を削除しますか？`;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={titleText}
      description={
        <>
          <p>この操作は取り消せません。バージョンに紐づく検出結果もすべて削除されます。</p>
        </>
      }
      body={
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">対象のバージョン</div>
          <div className="mt-2 space-y-1">
            <div className="font-mono text-sm text-emerald-700">
              {versionLabel} {target.title || "無題のバージョン"}
            </div>
            <div className="text-xs text-muted-foreground">
              作成日時: {formatDate(target.createdAt)}
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
