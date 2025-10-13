import EditorCore, { type OnMount } from "@monaco-editor/react";
import { SurfaceCard } from "@/components/atoms/SurfaceCard";
import FindingsPanel from "@/components/FindingsPanel";
import type { Finding } from "@/lib/detection";

export type EditorWorkspaceProps = {
  content: string;
  onContentChange: (value: string) => void;
  onMount: OnMount;
  findings: Finding[];
  onJump: (offset: number) => void;
  onSelectFinding: (finding: Finding) => void;
};

export function EditorWorkspace({
  content,
  onContentChange,
  onMount,
  findings,
  onJump,
  onSelectFinding,
}: EditorWorkspaceProps) {
  const handleChange = (value?: string) => {
    onContentChange(value ?? "");
  };

  // Monaco エディタと検出リストをまとめたレイアウトをオーガニズム化
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-inner">
        <EditorCore
          height="68vh"
          defaultLanguage="markdown"
          value={content}
          onChange={handleChange}
          onMount={onMount}
          options={{
            wordWrap: "on",
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            renderWhitespace: "boundary",
          }}
        />
      </div>

      <SurfaceCard className="bg-white/80 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-emerald-700">
            検出一覧（{findings.length}件）
          </h2>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          項目をクリックすると該当位置へジャンプし、「候補」ボタンでリライトを確認できます。
        </p>
        <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          <FindingsPanel findings={findings} onJump={onJump} onSelect={onSelectFinding} />
        </div>
      </SurfaceCard>
    </div>
  );
}
