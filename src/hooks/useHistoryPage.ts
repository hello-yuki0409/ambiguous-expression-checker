import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import {
  fetchArticlesSummary,
  fetchArticleDetail,
  fetchVersionDetail,
  deleteVersion,
  deleteArticle,
  type ArticleDetail,
  type ArticleSummary,
  type VersionDetail,
  type VersionSummary,
} from "@/lib/api";

// カスタムフック☆ History ページの状態と振る舞いを詰め込むやつ
export function useHistoryPage() {
  const [summaries, setSummaries] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
    null
  );
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [diff, setDiff] = useState<{
    left: VersionDetail;
    right: VersionDetail;
  } | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VersionSummary | null>(null);

  const [articleDeleteTarget, setArticleDeleteTarget] =
    useState<ArticleSummary | null>(null);
  const [articleDeleteLoading, setArticleDeleteLoading] = useState(false);
  const [articleDeleteError, setArticleDeleteError] = useState<string | null>(
    null
  );

  const loadSummaries = useCallback(
    async (preferredId?: string | null) => {
      setLoading(true);
      setSummaryError(null);
      setDeleteError(null);
      setArticleDeleteError(null);
      try {
        const list = await fetchArticlesSummary();
        setSummaries(list);
        if (!list.length) {
          setSelectedArticleId(null);
          return;
        }
        const targetId = preferredId ?? selectedArticleId;
        const nextSelected = targetId
          ? list.some((item) => item.id === targetId)
            ? targetId
            : list[0].id
          : list[0].id;
        setSelectedArticleId(nextSelected ?? null);
      } catch (err) {
        setSummaryError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [selectedArticleId]
  );

  // 履歴サマリーの取得をする
  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  // 記事詳細をフェッチしてクリーンアップも行う
  useEffect(() => {
    if (!selectedArticleId) {
      setArticle(null);
      setSelectedVersions([]);
      setDiff(null);
      setDiffError(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    setSelectedVersions([]);
    setDiff(null);
    setDiffError(null);
    setDeleteError(null);

    let cancelled = false;
    fetchArticleDetail(selectedArticleId)
      .then((detail) => {
        if (cancelled) return;
        setArticle(detail);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailError((err as Error).message);
      })
      .finally(() => {
        if (cancelled) return;
        setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedArticleId]);

  // バージョン詳細をフェッチして差分表示用にセットする
  useEffect(() => {
    if (selectedVersions.length !== 2) {
      setDiff(null);
      setDiffError(null);
      setDiffLoading(false);
      return;
    }
    setDiffLoading(true);
    setDiffError(null);

    let cancelled = false;
    Promise.all(selectedVersions.map((id) => fetchVersionDetail(id)))
      .then(([left, right]) => {
        if (cancelled) return;
        setDiff({ left, right });
      })
      .catch((err) => {
        if (cancelled) return;
        setDiffError((err as Error).message);
      })
      .finally(() => {
        if (cancelled) return;
        setDiffLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVersions]);

  const selectedSummaries = useMemo(() => {
    if (!article) return [] as VersionSummary[];
    return selectedVersions
      .map((id) => article.versions.find((v) => v.id === id))
      .filter((v): v is VersionSummary => Boolean(v));
  }, [article, selectedVersions]);

  const toggleVersion = useCallback((id: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(id)) {
        return prev.filter((v) => v !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedVersions([]);
    setDiff(null);
    setDiffError(null);
  }, []);

  const openDeleteDialog = useCallback((version: VersionSummary) => {
    setDeleteError(null);
    setDeleteTarget(version);
  }, []);

  const performDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const versionId = deleteTarget.id;

    setDeleteError(null);
    setDeleteLoadingId(versionId);
    try {
      await deleteVersion(versionId);

      setArticle((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          versions: prev.versions.filter((v) => v.id !== versionId),
        };
      });

      setSelectedVersions((prev) => prev.filter((id) => id !== versionId));
      setDiff((prev) => {
        if (!prev) return prev;
        if (prev.left.id === versionId || prev.right.id === versionId) {
          return null;
        }
        return prev;
      });

      await loadSummaries();
      setDeleteError(null);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError((err as Error).message || "削除に失敗しました");
    } finally {
      setDeleteLoadingId(null);
    }
  }, [deleteTarget, loadSummaries]);

  const openArticleDeleteDialog = useCallback(
    (articleSummary: ArticleSummary, event?: MouseEvent) => {
      event?.stopPropagation();
      setArticleDeleteError(null);
      setArticleDeleteTarget(articleSummary);
    },
    []
  );

  const performArticleDelete = useCallback(async () => {
    if (!articleDeleteTarget) return;
    const articleId = articleDeleteTarget.id;

    setArticleDeleteError(null);
    setArticleDeleteLoading(true);
    try {
      await deleteArticle(articleId);
      setArticle(null);
      setSelectedVersions([]);
      setDiff(null);
      setDiffError(null);
      setDeleteTarget(null);
      await loadSummaries(null);
      setArticleDeleteTarget(null);
    } catch (err) {
      setArticleDeleteError((err as Error).message || "削除に失敗しました");
    } finally {
      setArticleDeleteLoading(false);
    }
  }, [articleDeleteTarget, loadSummaries]);

  const handleArticleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setArticleDeleteTarget(null);
      setArticleDeleteError(null);
    }
  }, []);

  const handleVersionDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setDeleteTarget(null);
      setDeleteError(null);
    }
  }, []);

  const deletingArticleId =
    articleDeleteLoading && articleDeleteTarget ? articleDeleteTarget.id : null;

  // まとめて返してページ側をスッキリさせたい
  return {
    summaries,
    loading,
    summaryError,
    loadSummaries,
    selectedArticleId,
    setSelectedArticleId,
    article,
    detailLoading,
    detailError,
    selectedVersions,
    selectedSummaries,
    diff,
    diffLoading,
    diffError,
    deleteLoadingId,
    deleteError,
    deleteTarget,
    articleDeleteTarget,
    articleDeleteLoading,
    articleDeleteError,
    toggleVersion,
    clearSelection,
    openDeleteDialog,
    performDelete,
    openArticleDeleteDialog,
    performArticleDelete,
    handleArticleDeleteDialogChange,
    handleVersionDeleteDialogChange,
    deletingArticleId,
  };
}
