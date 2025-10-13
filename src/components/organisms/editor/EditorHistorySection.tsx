import { SurfaceCard } from "@/components/atoms/SurfaceCard";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/molecules/dialogs/ConfirmDialog";
import { HistoryRunListItem } from "@/components/molecules/editor/HistoryRunListItem";
import type { RunHistory } from "@/lib/history";

export type EditorHistorySectionProps = {
  history: RunHistory[];
  deleteDialogOpen: boolean;
  onDeleteDialogChange: (open: boolean) => void;
  onConfirmDelete: () => void;
};

export function EditorHistorySection({
  history,
  deleteDialogOpen,
  onDeleteDialogChange,
  onConfirmDelete,
}: EditorHistorySectionProps) {
  const handleDeleteClick = () => {
    if (history.length === 0) return;
    onDeleteDialogChange(true);
  };

  // 履歴セクション全体をまとめ、親側で状態管理だけ行えるようにする
  return (
    <aside>
      <SurfaceCard className="bg-white/80 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-emerald-700">直近履歴</h3>
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            disabled={history.length === 0}
            onClick={handleDeleteClick}
          >
            履歴を削除
          </Button>
        </div>
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={onDeleteDialogChange}
          title="直近の履歴をすべて削除しますか？"
          description="この操作は取り消せません"
          confirmLabel="削除する"
          onConfirm={onConfirmDelete}
        />

        {history.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">まだ履歴はありません</p>
        ) : (
          <ul className="mt-3 space-y-2 text-xs">
            {history.map((entry) => (
              <HistoryRunListItem key={entry.ts} entry={entry} />
            ))}
          </ul>
        )}
      </SurfaceCard>
    </aside>
  );
}
