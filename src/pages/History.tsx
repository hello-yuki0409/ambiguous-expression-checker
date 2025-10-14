import { useEffect, useMemo, useState } from "react";
import type { editor as MonacoEditor } from "monaco-editor";
import { StatusChip } from "@/components/atoms/StatusChip";
import { EmptyStateMessage } from "@/components/atoms/EmptyStateMessage";
import { MetricPill } from "@/components/atoms/MetricPill";
import { SurfaceCard } from "@/components/atoms/SurfaceCard";
import { VersionHistoryCard } from "@/components/molecules/history/VersionHistoryCard";
import { HistoryArticleSidebar } from "@/components/organisms/history/HistoryArticleSidebar";
import { HistoryDiffSection } from "@/components/organisms/history/HistoryDiffSection";
import { PageShell } from "@/components/templates/PageShell";
import { TwoColumnTemplate } from "@/components/templates/TwoColumnTemplate";
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
import { VersionDeleteDialog } from "@/components/organisms/history/VersionDeleteDialog";
import { ArticleDeleteDialog } from "@/components/organisms/history/ArticleDeleteDialog";
import { formatDateTime, formatScore } from "@/lib/formatters";

// DiffEditor の自動リサイズがうまく働かないことがあるので、マウント時に wordWrap を設定し直す
const handleDiffMount = (diffEditor: MonacoEditor.IStandaloneDiffEditor) => {
  const original = diffEditor.getOriginalEditor();
  const modified = diffEditor.getModifiedEditor();
  original?.updateOptions({ wordWrap: "on", wrappingIndent: "same" });
  modified?.updateOptions({ wordWrap: "on", wrappingIndent: "same" });
};

export default function History() {
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

  const deletingArticleId =
    articleDeleteLoading && articleDeleteTarget ? articleDeleteTarget.id : null;

  const selectedSummaries = useMemo(() => {
    if (!article) return [] as VersionSummary[];
    return selectedVersions
      .map((id) => article.versions.find((v) => v.id === id))
      .filter((v): v is VersionSummary => Boolean(v));
  }, [article, selectedVersions]);

  const loadSummaries = async (preferredId?: string | null) => {
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
  };

  useEffect(() => {
    loadSummaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const toggleVersion = (id: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(id)) {
        return prev.filter((v) => v !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const clearSelection = () => {
    setSelectedVersions([]);
    setDiff(null);
    setDiffError(null);
  };

  const openDeleteDialog = (version: VersionSummary) => {
    setDeleteError(null);
    setDeleteTarget(version);
  };

  const performDelete = async () => {
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
  };

  const openArticleDeleteDialog = (
    articleSummary: ArticleSummary,
    event?: React.MouseEvent
  ) => {
    event?.stopPropagation();
    setArticleDeleteError(null);
    setArticleDeleteTarget(articleSummary);
  };

  const performArticleDelete = async () => {
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
  };

  return (
    <>
    <PageShell>
      <TwoColumnTemplate
        className="items-start"
        main={
          <section className="space-y-6">
            {!selectedArticleId ? (
              <EmptyStateMessage className="bg-white/60 text-center">
                記事を選択すると履歴が表示されます。
              </EmptyStateMessage>
            ) : detailLoading ? (
              <div className="rounded-2xl border border-emerald-100 bg-white/70 p-6 text-center text-sm text-muted-foreground">
                読み込み中...
              </div>
            ) : detailError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                {detailError}
              </div>
            ) : !article ? (
              <div className="rounded-2xl border border-emerald-100 bg-white/70 p-6 text-sm text-muted-foreground">
                データが見つかりませんでした。
              </div>
            ) : (
              <>
                <SurfaceCard className="bg-white/80 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        {article.title || "無題の記事"}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        作成: {formatDateTime(article.createdAt)} / 更新:{" "}
                        {formatDateTime(article.updatedAt)}
                      </p>
                    </div>
                    <div className="grid w-full max-w-sm grid-cols-2 gap-2 text-center text-xs">
                      <MetricPill className="rounded-xl p-3">
                        <div className="opacity-80">バージョン数</div>
                        <div className="text-lg font-semibold">
                          {article.versions.length}
                        </div>
                      </MetricPill>
                      <MetricPill className="rounded-xl p-3">
                        <div className="opacity-80">最新スコア</div>
                        <div className="text-lg font-semibold">
                          {formatScore(
                            article.versions[0]?.checkRun?.aimaiScore
                          )}
                        </div>
                      </MetricPill>
                    </div>
                  </div>
                </SurfaceCard>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-emerald-700">
                      バージョン履歴
                    </h3>
                    <div className="flex items-center gap-2">
                      {/* 選択状態のラベルは視覚的統一感を保つために StatusChip で共通化 */}
                      <StatusChip active={selectedVersions.length === 0}>
                        未選択
                      </StatusChip>
                      <StatusChip active={selectedVersions.length === 1}>
                        1 件
                      </StatusChip>
                      <StatusChip active={selectedVersions.length === 2}>
                        2 件
                      </StatusChip>
                    </div>
                  </div>
                  {deleteError && !deleteTarget && (
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                      {deleteError}
                    </p>
                  )}
                  {article.versions.length === 0 ? (
                    <EmptyStateMessage className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
                      まだバージョンがありません。
                    </EmptyStateMessage>
                  ) : (
                    <div className="grid gap-3">
                      {article.versions.map((version) => {
                        const selected = selectedVersions.includes(version.id);
                        const disableActions = deleteLoadingId === version.id;
                        return (
                          <VersionHistoryCard
                            key={version.id}
                            version={version}
                            selected={selected}
                            onToggle={() => toggleVersion(version.id)}
                            onDelete={() => openDeleteDialog(version)}
                            disableActions={disableActions}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <HistoryDiffSection
                  selectedSummaries={selectedSummaries}
                  selectedVersionsCount={selectedVersions.length}
                  diff={diff}
                  diffError={diffError}
                  diffLoading={diffLoading}
                  onClearSelection={clearSelection}
                  onDiffMount={handleDiffMount}
                />
              </>
            )}
          </section>
        }
        side={
          <HistoryArticleSidebar
            summaries={summaries}
            loading={loading}
            errorMessage={summaryError}
            selectedArticleId={selectedArticleId}
            onReload={() => loadSummaries(selectedArticleId)}
            onSelect={(id) => setSelectedArticleId(id)}
            onDelete={(summary) => openArticleDeleteDialog(summary)}
            deletingArticleId={deletingArticleId}
          />
        }
      />
    </PageShell>

      <ArticleDeleteDialog
        open={Boolean(articleDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setArticleDeleteTarget(null);
            setArticleDeleteError(null);
          }
        }}
        target={articleDeleteTarget}
        onConfirm={performArticleDelete}
        loading={articleDeleteLoading}
        errorMessage={articleDeleteError}
      />

      <VersionDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        target={deleteTarget}
        onConfirm={performDelete}
        loading={Boolean(deleteTarget && deleteLoadingId === deleteTarget.id)}
        errorMessage={deleteError}
      />
    </>
  );
}
