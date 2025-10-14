import { useEffect, useMemo, useRef, useState } from "react";
import { type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import RewriteDialog from "@/components/RewriteDialog";
import { detect, type Finding } from "@/lib/detection";
import { defaultPatterns } from "@/lib/patterns";
import { SurfaceCard } from "@/components/atoms/SurfaceCard";
import { EditorTitleForm } from "@/components/molecules/editor/EditorTitleForm";
import { EditorActionBar } from "@/components/molecules/editor/EditorActionBar";
import { EditorWorkspace } from "@/components/organisms/editor/EditorWorkspace";
import { EditorHistorySection } from "@/components/organisms/editor/EditorHistorySection";
import { PageShell } from "@/components/templates/PageShell";
import { TwoColumnTemplate } from "@/components/templates/TwoColumnTemplate";
import {
  loadHistory,
  pushHistory,
  clearHistory,
  type RunHistory,
} from "@/lib/history";
import { saveVersion } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

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
    <PageShell>
      <TwoColumnTemplate
        main={
          <SurfaceCard as="section" className="space-y-4 bg-white/70 p-6 backdrop-blur">
            <div className="space-y-3">
              <EditorTitleForm
                title={title}
                onChange={handleTitleChange}
                articleId={articleId}
              />
              <EditorActionBar
                ms={ms}
                onClear={clearAll}
                onRunCheck={runCheck}
                onSave={handleSave}
                saving={saving}
              />
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

            <EditorWorkspace
              content={content}
              onContentChange={setContent}
              onMount={onMount}
              findings={findings}
              onJump={jumpTo}
              onSelectFinding={(f) => setSelected(f)}
            />
          </SurfaceCard>
        }
        side={
          <EditorHistorySection
            history={history}
            deleteDialogOpen={openDelete}
            onDeleteDialogChange={setOpenDelete}
            onConfirmDelete={() => {
              clearHistory();
              setHistory([]);
              setOpenDelete(false);
            }}
          />
        }
      />

      <RewriteDialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        original={selected?.text ?? ""}
        context={
          selected
            ? buildContextSnippet(content, selected.start, selected.end)
            : content
        }
        category={selected?.category}
        style="敬体"
        onReplace={replaceSelected}
      />
    </PageShell>
  );
}
