import { Button } from "@/components/ui/button";

export type EditorActionBarProps = {
  ms: number;
  onClear: () => void;
  onRunCheck: () => void;
  onSave: () => void;
  saving: boolean;
};

export function EditorActionBar({
  ms,
  onClear,
  onRunCheck,
  onSave,
  saving,
}: EditorActionBarProps) {
  // ボタン群と検出時間表示をひとまとめにし、ロジックを親に残したまま UI を再利用可能にする
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-muted-foreground">
        検出時間 <span className="font-mono text-sm text-emerald-700">{ms}ms</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          onClick={onClear}
        >
          クリア
        </Button>
        <Button onClick={onRunCheck} className="bg-emerald-500 text-white hover:bg-emerald-600">
          チェック
        </Button>
        <Button
          onClick={onSave}
          disabled={saving}
          className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-70"
        >
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  );
}
