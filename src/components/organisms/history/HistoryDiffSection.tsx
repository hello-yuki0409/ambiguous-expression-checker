import { SurfaceCard } from "@/components/atoms/SurfaceCard";
import { Button } from "@/components/ui/button";
import { EmptyStateMessage } from "@/components/atoms/EmptyStateMessage";
import { formatDateTime, formatScore } from "@/lib/formatters";
import { DiffEditor } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import type { VersionDetail, VersionSummary } from "@/lib/api";

export type HistoryDiffSectionProps = {
  selectedSummaries: VersionSummary[];
  selectedVersionsCount: number;
  diff: { left: VersionDetail; right: VersionDetail } | null;
  diffError: string | null;
  diffLoading: boolean;
  onClearSelection: () => void;
  onDiffMount: (diffEditor: MonacoEditor.IStandaloneDiffEditor) => void;
};

export function HistoryDiffSection({
  selectedSummaries,
  selectedVersionsCount,
  diff,
  diffError,
  diffLoading,
  onClearSelection,
  onDiffMount,
}: HistoryDiffSectionProps) {
  const showDiff = diff && !diffError;

  // Diff 表示エリアを独立させる。 History ページでのロジックを見通しが良くなるはず。
  return (
    <SurfaceCard className="bg-white/80 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-emerald-700">Diff</h3>
        <Button
          variant="outline"
          size="sm"
          className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          onClick={onClearSelection}
        >
          選択をクリア
        </Button>
      </div>

      {selectedSummaries.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {selectedSummaries.map((v, idx) => (
            <div
              key={v.id}
              className="rounded-xl border border-emerald-100 bg-emerald-500/5 px-4 py-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  {idx === 0 ? "基準" : "比較"} v{v.index + 1}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(v.createdAt)}
                </span>
              </div>
              {v.checkRun && (
                <div className="mt-2 grid grid-cols-2 gap-2 font-mono">
                  <div className="rounded-lg bg-white px-3 py-2 text-emerald-700">
                    件数 {v.checkRun.totalCount}
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 text-emerald-700">
                    スコア {formatScore(v.checkRun.aimaiScore)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedVersionsCount < 2 && (
        <EmptyStateMessage className="mt-3 rounded-lg bg-white px-4 py-3">
          Diff を表示するには 2 つのバージョンを選択してください。
        </EmptyStateMessage>
      )}

      {diffError && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {diffError}
        </p>
      )}

      {diffLoading && !diffError && (
        <p className="mt-3 text-sm text-muted-foreground">
          Diff を読み込み中...
        </p>
      )}

      <div
        className="mt-4 overflow-hidden rounded-xl border border-emerald-100"
        style={{ display: showDiff ? "block" : "none" }}
      >
        <DiffEditor
          key="history-diff-editor"
          height="60vh"
          language="markdown"
          original={showDiff ? diff?.left.content ?? "" : ""}
          modified={showDiff ? diff?.right.content ?? "" : ""}
          keepCurrentOriginalModel
          keepCurrentModifiedModel
          onMount={onDiffMount}
          options={{
            readOnly: true,
            fontSize: 14,
            renderSideBySide: true,
            wordWrap: "on",
            diffWordWrap: "on",
            minimap: { enabled: false },
          }}
        />
      </div>
    </SurfaceCard>
  );
}
