import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { detect, type Finding } from "@/lib/detection";
import { defaultPatterns } from "@/lib/patterns";
import {
  clearHistory as clearHistoryStorage,
  loadHistory,
  pushHistory,
  type RunHistory,
} from "@/lib/history";
import { saveVersion } from "@/lib/api";
import type { User } from "firebase/auth";

// カスタムフック☆ Editor ページの状態管理をまとめる
const STORAGE_KEY = "aimai__lastContent";
const TITLE_KEY = "aimai__articleTitle";
const ARTICLE_ID_KEY = "aimai__articleId";

export type UseEditorStateResult = {
  content: string;
  setContent: (value: string) => void;
  title: string;
  handleTitleChange: (value: string) => void;
  articleId: string | null;
  findings: Finding[];
  ms: number;
  history: RunHistory[];
  historyDeleteOpen: boolean;
  setHistoryDeleteOpen: (open: boolean) => void;
  selected: Finding | null;
  setSelected: (finding: Finding | null) => void;
  saving: boolean;
  saveError: string | null;
  saveMessage: string | null;
  onMount: OnMount;
  clearAll: () => void;
  runCheck: () => void;
  handleSave: () => Promise<void>;
  jumpTo: (offset: number) => void;
  replaceSelected: (newText: string) => void;
  handleConfirmDeleteHistory: () => void;
};

export function useEditorState(user: User | null): UseEditorStateResult {
  const [content, setContent] = useState<string>(
    () => window.localStorage.getItem(STORAGE_KEY) ?? ""
  );
  const [title, setTitle] = useState<string>(() => {
    try {
      return window.localStorage.getItem(TITLE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [articleId, setArticleId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(ARTICLE_ID_KEY);
    } catch {
      return null;
    }
  });
  const [findings, setFindings] = useState<Finding[]>([]);
  const [ms, setMs] = useState<number>(0);
  const [history, setHistory] = useState<RunHistory[]>(() => loadHistory());
  const [historyDeleteOpen, setHistoryDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Finding | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const decorationsRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const onMount: OnMount = useCallback((editor, monacoApi) => {
    editorRef.current = editor;
    monacoRef.current = monacoApi;
  }, []);

  const clearAll = useCallback(() => {
    setContent("");
    setTitle("");
    setArticleId(null);
    setFindings([]);
    setMs(0);
    setSaveError(null);
    setSaveMessage(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(TITLE_KEY);
      window.localStorage.removeItem(ARTICLE_ID_KEY);
    } catch (err) {
      console.warn("Failed to clear content:", err);
    }
    clearHistoryStorage();
    setHistory([]);
  }, []);

  const evaluateContent = useCallback((value: string) => {
    const t0 = performance.now();
    const result = detect(value, defaultPatterns);
    const elapsed = Math.round(performance.now() - t0);
    setFindings(result);
    setMs(elapsed);
    return { result, elapsed };
  }, []);

  const runCheck = useCallback(() => {
    const { result, elapsed } = evaluateContent(content);
    try {
      window.localStorage.setItem(STORAGE_KEY, content);
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
  }, [content, evaluateContent]);

  const handleSave = useCallback(async () => {
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
        window.localStorage.setItem(STORAGE_KEY, content);
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
          window.localStorage.setItem(ARTICLE_ID_KEY, response.article.id);
        } catch (err) {
          console.warn("Failed to persist article id:", err);
        }
      }

      if (response.article.title && response.article.title !== title) {
        setTitle(response.article.title);
        try {
          window.localStorage.setItem(TITLE_KEY, response.article.title);
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
  }, [articleId, content, evaluateContent, title, user]);

  const jumpTo = useCallback((offset: number) => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    const pos = model.getPositionAt(offset);
    editor.revealPositionInCenter(pos);
    editor.setPosition(pos);
    editor.focus();
  }, []);

  const replaceSelected = useCallback(
    (newText: string) => {
      if (!selected) return;
      const before = content.slice(0, selected.start);
      const after = content.slice(selected.end);
      const next = before + newText + after;
      setContent(next);
      setSelected(null);

      const { result, elapsed } = evaluateContent(next);
      setFindings(result);
      setMs(elapsed);
    },
    [content, evaluateContent, selected]
  );

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    try {
      window.localStorage.setItem(TITLE_KEY, value);
    } catch (err) {
      console.warn("Failed to persist title:", err);
    }
  }, []);

  const handleConfirmDeleteHistory = useCallback(() => {
    clearHistoryStorage();
    setHistory([]);
    setHistoryDeleteOpen(false);
  }, []);

  const decorations = useMemo(() => {
    if (!editorRef.current || !monacoRef.current)
      return [] as monaco.editor.IModelDeltaDecoration[];
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
      } satisfies monaco.editor.IModelDeltaDecoration;
    });
  }, [findings]);
  
  // Monaco Editor の装飾を差し替えたり後始末したりする
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

  // 保存完了メッセージを一定時間でクリアするため
  useEffect(() => {
    if (!saveMessage) return;
    const timer = window.setTimeout(() => setSaveMessage(null), 2500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [saveMessage]);

  return {
    content,
    setContent,
    title,
    handleTitleChange,
    articleId,
    findings,
    ms,
    history,
    historyDeleteOpen,
    setHistoryDeleteOpen,
    selected,
    setSelected,
    saving,
    saveError,
    saveMessage,
    onMount,
    clearAll,
    runCheck,
    handleSave,
    jumpTo,
    replaceSelected,
    handleConfirmDeleteHistory,
  };
}
