import { useEffect, useMemo, useRef, useState } from "react";
import EditorCore, { type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import FindingsPanel from "@/components/FindingsPanel";
import RewriteDialog from "@/components/RewriteDialog";
import { detect, type Finding } from "@/lib/detection";
import { defaultPatterns } from "@/lib/patterns";
import { Button } from "@/components/ui/button";
import {
  loadHistory,
  pushHistory,
  clearHistory,
  type RunHistory,
} from "@/lib/history";
import { saveVersion } from "@/lib/api";
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
const TITLE_KEY = "aimai__articleTitle";
const ARTICLE_ID_KEY = "aimai__articleId";

export default function Editor() {
  const [content, setContent] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? ""
  );
  const [title, setTitle] = useState<string>(() => {
    try {
      return localStorage.getItem(TITLE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [articleId, setArticleId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ARTICLE_ID_KEY);
    } catch {
      return null;
    }
  });
  const [findings, setFindings] = useState<Finding[]>([]);
  const [ms, setMs] = useState<number>(0);
  const [history, setHistory] = useState<RunHistory[]>(() => loadHistory());
  const [openDelete, setOpenDelete] = useState(false);

  // 👇 Phase3 用 state
  const [selected, setSelected] = useState<Finding | null>(null);
  const [tone, setTone] = useState<"敬体" | "常体">("敬体");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const decorationsRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const clearAll = () => {
    setContent("");
    setTitle("");
    setArticleId(null);
    setFindings([]);
    setMs(0);
    setSaveError(null);
    setSaveMessage(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TITLE_KEY);
      localStorage.removeItem(ARTICLE_ID_KEY);
    } catch (err) {
      console.warn("Failed to clear content:", err);
    }
    clearHistory();
    setHistory([]);
  };

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

  useEffect(() => {
    if (!saveMessage) return;
    const timer = window.setTimeout(() => setSaveMessage(null), 2500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [saveMessage]);

  const onMount: OnMount = (editor, monacoApi) => {
    editorRef.current = editor;
    monacoRef.current = monacoApi;
  };

  const evaluateContent = (value: string) => {
    const t0 = performance.now();
    const result = detect(value, defaultPatterns);
    const elapsed = Math.round(performance.now() - t0);
    setFindings(result);
    setMs(elapsed);
    return { result, elapsed };
  };

  const runCheck = () => {
    const { result, elapsed } = evaluateContent(content);
    try {
      localStorage.setItem(STORAGE_KEY, content);
    } catch (err) {
      console.warn("Failed to save content:", err);
    }

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

  const handleSave = async () => {
    if (!content.trim()) {
      setSaveError("本文が空です");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    const { result } = evaluateContent(content);
    try {
      try {
        localStorage.setItem(STORAGE_KEY, content);
      } catch (err) {
        console.warn("Failed to save content:", err);
      }

      const response = await saveVersion({
        articleId: articleId ?? undefined,
        title: title.trim() ? title.trim() : null,
        content,
        findings: result.map((f) => ({
          start: f.start,
          end: f.end,
          category: f.category,
          severity: f.severity,
          text: f.text,
          reason: f.reason ?? null,
          patternId: f.patternId ?? null,
        })),
      });

      if (response.article.id !== articleId) {
        setArticleId(response.article.id);
        try {
          localStorage.setItem(ARTICLE_ID_KEY, response.article.id);
        } catch (err) {
          console.warn("Failed to persist article id:", err);
        }
      }

      if (response.article.title && response.article.title !== title) {
        setTitle(response.article.title);
        try {
          localStorage.setItem(TITLE_KEY, response.article.title);
        } catch (err) {
          console.warn("Failed to persist title:", err);
        }
      }

      setSaveMessage("保存しました");
    } catch (err) {
      setSaveError((err as Error).message || "保存に失敗しました");
    } finally {
      setSaving(false);
    }
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

  const replaceSelected = (newText: string) => {
    if (!selected) return;
    const before = content.slice(0, selected.start);
    const after = content.slice(selected.end);
    const next = before + newText + after;
    setContent(next);
    setSelected(null);

    // 差し替え直後に再チェックする処理
    const t0 = performance.now();
    const result = detect(next, defaultPatterns);
    const elapsed = Math.round(performance.now() - t0);
    setFindings(result);
    setMs(elapsed);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    try {
      localStorage.setItem(TITLE_KEY, value);
    } catch (err) {
      console.warn("Failed to persist title:", err);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 p-6">
      <div className="col-span-8">
        <div className="mb-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            記事タイトル
          </label>
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="記事タイトル（任意）"
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300"
          />
          {articleId && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Article ID: {articleId}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm opacity-70">
            検出時間: <span className="font-mono">{ms}ms</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button variant="outline" onClick={clearAll}>
              クリア
            </Button>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as "敬体" | "常体")}
              className="border rounded-md px-2 py-1 text-xs"
              aria-label="tone"
            >
              <option value="敬体">敬体</option>
              <option value="常体">常体</option>
            </select>
            <Button onClick={runCheck}>チェック</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
        {(saveError || saveMessage) && (
          <div className="mb-2 text-sm">
            {saveError ? (
              <p className="text-red-600">{saveError}</p>
            ) : (
              <p className="text-green-600">{saveMessage}</p>
            )}
          </div>
        )}
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
        <FindingsPanel
          findings={findings}
          onJump={jumpTo}
          onSelect={(f) => setSelected(f)} // 候補を開く
        />
        <p className="text-xs text-muted-foreground mt-3">
          項目クリックで本文へジャンプ。「候補」でリライト表示
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
            >
              履歴を削除
            </Button>
          </div>

          {/* 削除確認モーダル */}
          <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  直近の履歴をすべて削除しますか？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  ⚠️この操作は取り消せません
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    clearHistory();
                    setHistory([]);
                  }}
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

      {/* 候補モーダル */}
      <RewriteDialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        original={selected?.text ?? ""}
        style={tone}
        onReplace={replaceSelected}
      />
    </div>
  );
}
