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
import { useAuth } from "@/hooks/useAuth";
import { ConfirmDialog } from "@/components/molecules/dialogs/ConfirmDialog";

const STORAGE_KEY = "aimai__lastContent";
const TITLE_KEY = "aimai__articleTitle";
const ARTICLE_ID_KEY = "aimai__articleId";
const CONTEXT_RADIUS = 120;

function buildContextSnippet(
  source: string,
  start: number,
  end: number,
  radius = CONTEXT_RADIUS
) {
  if (!source.length) {
    return "";
  }
  const safeStart = Math.max(0, start - radius);
  const safeEnd = Math.min(source.length, end + radius);
  const snippet = source.slice(safeStart, safeEnd);
  return snippet.trim() ? snippet : source;
}

export default function Editor() {
  const { user } = useAuth();
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

    if (!user) {
      setSaveError("ログイン情報が確認できませんでした");
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
        authorLabel: user.displayName?.trim() || null,
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
    <div className="min-h-full bg-gradient-to-br from-emerald-50 via-white to-white">
      <div className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[minmax(0,1fr),320px]">
        <section className="space-y-4 rounded-2xl border border-emerald-100 bg-white/70 p-6 shadow-sm backdrop-blur">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-emerald-700">記事タイトル</label>
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="記事タイトル（任意）"
                className="mt-1 w-full rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
              {articleId && (
                <p className="mt-1 text-[11px] text-muted-foreground">Article ID: {articleId}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                検出時間 <span className="font-mono text-sm text-emerald-700">{ms}ms</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  onClick={clearAll}
                >
                  クリア
                </Button>
                <Button onClick={runCheck} className="bg-emerald-500 text-white hover:bg-emerald-600">
                  チェック
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-70"
                >
                  {saving ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
            {(saveError || saveMessage) && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  saveError
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {saveError ?? saveMessage}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-inner">
              <EditorCore
                height="68vh"
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

            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-emerald-700">
                  検出一覧（{findings.length}件）
                </h2>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                項目をクリックすると該当位置へジャンプし、「候補」ボタンでリライトを確認できます。
              </p>
              <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                <FindingsPanel
                  findings={findings}
                  onJump={jumpTo}
                  onSelect={(f) => setSelected(f)}
                />
              </div>
            </div>
          </div>
        </section>

        <aside>
          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-emerald-700">直近履歴</h3>
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                disabled={history.length === 0}
                onClick={() => {
                  if (history.length === 0) return;
                  setOpenDelete(true);
                }}
              >
                履歴を削除
              </Button>
            </div>
            <ConfirmDialog
              open={openDelete}
              onOpenChange={setOpenDelete}
              title="直近の履歴をすべて削除しますか？"
              description="この操作は取り消せません"
              confirmLabel="削除する"
              onConfirm={() => {
                clearHistory();
                setHistory([]);
                setOpenDelete(false);
              }}
            />

            {history.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">まだ履歴はありません</p>
            ) : (
              <ul className="mt-3 space-y-2 text-xs">
                {history.map((h, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2"
                  >
                    <span className="font-medium text-emerald-700">
                      {new Date(h.ts).toLocaleString(undefined, { hour12: false })}
                    </span>
                    <span className="font-mono text-emerald-800">
                      {h.count}件 / {h.length}字 / {h.ms}ms
                    </span>
                    {h.topWords.length > 0 && (
                      <span className="truncate text-right text-[11px] text-emerald-600">
                        {h.topWords.join(" / ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

      {/* 候補モーダル */}
      <RewriteDialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        original={selected?.text ?? ""}
        context={
          selected ? buildContextSnippet(content, selected.start, selected.end) : content
        }
        category={selected?.category}
        style="敬体"
        onReplace={replaceSelected}
      />
      </div>
    </div>
  );
}
