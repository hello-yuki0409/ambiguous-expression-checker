import { useEffect, useRef, useState } from "react";
import EditorCore, { type OnMount } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import FindingsPanel from "@/components/FindingsPanel";
import { detect, type Finding } from "@/lib/detection";
import { defaultPatterns } from "@/lib/patterns";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "aimai__lastContent";

export default function Editor() {
  const [content, setContent] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? ""
  );
  const [findings, setFindings] = useState<Finding[]>([]);
  const [ms, setMs] = useState<number>(0);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const decorationsRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const onMount: OnMount = (editor, monacoNS) => {
    editorRef.current = editor;
    monacoRef.current = monacoNS as unknown as typeof import("monaco-editor");
    decorationsRef.current = editor.createDecorationsCollection();
  };

  // findings が変わったときだけ装飾を差し替える
  useEffect(() => {
    const editor = editorRef.current;
    const monacoNS = monacoRef.current;
    const collection = decorationsRef.current;
    if (!editor || !monacoNS || !collection) return;

    const model = editor.getModel();
    if (!model) return;

    const decos: monaco.editor.IModelDeltaDecoration[] = findings.map((f) => {
      const start = model.getPositionAt(f.start);
      const end = model.getPositionAt(f.end);
      const hover: monaco.IMarkdownString = {
        value: `**${f.category}**: ${f.reason ?? "曖昧な表現"}`,
      };
      return {
        range: new monacoNS.Range(
          start.lineNumber,
          start.column,
          end.lineNumber,
          end.column
        ),
        options: {
          inlineClassName: `aimai-sev-${f.severity}`,
          hoverMessage: hover,
        },
      };
    });

    collection.set(decos);
  }, [findings]);

  // アンマウント時にクリーンアップする
  useEffect(() => {
    return () => {
      try {
        decorationsRef.current?.clear();
      } catch (err) {
        console.error("Decoration cleanup failed:", err);
      }
    };
  }, []);

  const runCheck = () => {
    const t0 = performance.now();
    const result = detect(content, defaultPatterns);
    const t1 = performance.now();
    setFindings(result);
    setMs(Math.round(t1 - t0));
    localStorage.setItem(STORAGE_KEY, content);
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
            <Button variant="outline" onClick={() => setContent("")}>
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
      </div>
    </div>
  );
}
