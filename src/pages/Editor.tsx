import { useEffect, useMemo, useRef, useState } from "react";
import EditorCore, { type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import FindingsPanel from "@/components/FindingsPanel";
import { detect, type Finding } from "@/lib/detection";
import { defaultPatterns } from "@/lib/patterns";
import { Button } from "@/components/ui/button";
import {
  loadHistory,
  pushHistory,
  clearHistory,
  type RunHistory,
} from "@/lib/history";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
const STORAGE_KEY = "aimai__lastContent";

export default function Editor() {
  const [content, setContent] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? ""
  );
  const [findings, setFindings] = useState<Finding[]>([]);
  const [ms, setMs] = useState<number>(0);
  const [history, setHistory] = useState<RunHistory[]>(() => loadHistory());
  const [openDelete, setOpenDelete] = useState(false);
  const clearAll = () => {
    setContent("");
    setFindings([]);
    setMs(0);
    localStorage.removeItem(STORAGE_KEY);
  };

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const decorationsRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  // severity ごとのインライン装飾クラス
  const decorations: monaco.editor.IModelDeltaDecoration[] = useMemo(() => {
    if (!editorRef.current || !monacoRef.current) return [];
    const monacoApi = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return [];

    return findings.map((f) => {
      const start = model.getPositionAt(f.start);
      const end = model.getPositionAt(f.end);
      return {
        range: new monacoApi.Range(
          start.lineNumber,
          start.column,
          end.lineNumber,
          end.column
        ),
        options: {
          inlineClassName: `aimai-sev-${f.severity}`,
          hoverMessage: {
            value: `**${f.category}**: ${f.reason ?? "曖昧な表現"}`,
          },
        },
      };
    });
  }, [findings]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (!decorationsRef.current) {
      decorationsRef.current = editor.createDecorationsCollection();
    }
    decorationsRef.current.set(decorations);

    return () => {
      decorationsRef.current?.clear();
    };
  }, [decorations]);

  const onMount: OnMount = (editor, monacoApi) => {
    editorRef.current = editor;
    monacoRef.current = monacoApi;
  };

  const runCheck = () => {
    const t0 = performance.now();
    const result = detect(content, defaultPatterns);
    const t1 = performance.now();
    const elapsed = Math.round(t1 - t0);

    setFindings(result);
    setMs(elapsed);
    try {
      localStorage.setItem(STORAGE_KEY, content);
    } catch (err) {
      console.warn("Failed to save content:", err);
    }

    // 上位頻出語（最大3）
    const freq = new Map<string, number>();
    result.forEach((f) => freq.set(f.text, (freq.get(f.text) ?? 0) + 1));
    const topWords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([w]) => w);

    const record: RunHistory = {
      ts: Date.now(),
      length: content.length,
      count: result.length,
      ms: elapsed,
      topWords,
    };
    setHistory(pushHistory(record));
  };

  const jumpTo = (offset: number) => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    const pos = model.getPositionAt(offset);
    editor.revealPositionInCenter(pos);
    editor.setPosition(pos);
    editor.focus();
  };

  return (
    <div className="grid grid-cols-12 gap-4 p-6">
      <div className="col-span-8">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm opacity-70">
            検出時間: <span className="font-mono">{ms}ms</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearAll}>
              クリア
            </Button>
            <Button onClick={runCheck}>チェック</Button>
          </div>
        </div>
        <EditorCore
          height="70vh"
          defaultLanguage="markdown"
          value={content}
          onChange={(v) => setContent(v ?? "")}
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

      <div className="col-span-4">
        <h2 className="font-semibold mb-2">検出一覧（{findings.length}件）</h2>
        <FindingsPanel findings={findings} onJump={jumpTo} />
        <p className="text-xs text-muted-foreground mt-3">
          * severity色: 1=黄, 2=橙, 3=赤。項目クリックで本文へジャンプ。
        </p>

        <div className="mt-6 border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">直近履歴</h3>
            <Button
              variant="outline"
              size="sm"
              disabled={history.length === 0}
              onClick={() => {
                if (history.length === 0) return;
                setOpenDelete(true);
              }}
              aria-disabled={history.length === 0}
            >
              履歴を削除
            </Button>
          </div>
          {/* 削除確認モーダル（shadcn/ui AlertDialog） */}
          <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  直近履歴をすべて削除しますか？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  ⚠️この操作は取り消せません
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setOpenDelete(false)}
                  aria-label="キャンセル"
                >
                  キャンセル
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    clearHistory();
                    setHistory([]);
                    setOpenDelete(false);
                  }}
                  aria-label="削除を実行"
                >
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              まだ履歴はありません
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="opacity-70">
                    {new Date(h.ts).toLocaleString(undefined, {
                      hour12: false,
                    })}
                  </span>
                  <span className="font-mono">
                    {h.count}件 / {h.length}字 / {h.ms}ms
                  </span>
                  {h.topWords.length > 0 && (
                    <span className="truncate max-w-[140px] opacity-80">
                      {h.topWords.join(" / ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
