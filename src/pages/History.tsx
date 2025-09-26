import { useEffect, useMemo, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import {
  fetchArticlesSummary,
  fetchArticleDetail,
  fetchVersionDetail,
  deleteVersion,
  type ArticleDetail,
  type ArticleSummary,
  type VersionDetail,
  type VersionSummary,
} from "@/lib/api";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { hour12: false });
}

function formatScore(score: number | null | undefined) {
  if (score === null || score === undefined) return "-";
  return score.toFixed(2);
}

function formatPercent(value: number | null | undefined, fractionDigits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "―";
  }
  const rounded = value.toFixed(fractionDigits);
  const numeric = Number(rounded);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

type Trend = {
  countDiff: number;
  countPercent: number | null;
  scoreDiff: number;
  scorePercent: number | null;
};

function computeTrend(latest?: VersionSummary["checkRun"], previous?: VersionSummary["checkRun"]) {
  if (!latest || !previous) return null;
  const countDiff = latest.totalCount - previous.totalCount;
  const countPercent =
    previous.totalCount > 0
      ? (countDiff / previous.totalCount) * 100
      : null;
  const scoreDiff = latest.aimaiScore - previous.aimaiScore;
  const scorePercent =
    previous.aimaiScore !== 0
      ? (scoreDiff / previous.aimaiScore) * 100
      : null;
  return { countDiff, countPercent, scoreDiff, scorePercent } satisfies Trend;
}

function trendClass(value: number) {
  if (value < 0) return "text-emerald-600";
  if (value > 0) return "text-red-600";
  return "text-muted-foreground";
}

function chipClass(isActive: boolean) {
  return `px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
    isActive
      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
      : "border-transparent bg-muted/40 text-muted-foreground"
  }`;
}

export default function History() {
  const [summaries, setSummaries] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [diff, setDiff] = useState<{ left: VersionDetail; right: VersionDetail } | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectedSummaries = useMemo(() => {
    if (!article) return [] as VersionSummary[];
    return selectedVersions
      .map((id) => article.versions.find((v) => v.id === id))
      .filter((v): v is VersionSummary => Boolean(v));
  }, [article, selectedVersions]);

  const loadSummaries = async () => {
    setLoading(true);
    setSummaryError(null);
    setDeleteError(null);
    try {
      const list = await fetchArticlesSummary();
      setSummaries(list);
      if (!list.length) {
        setSelectedArticleId(null);
        return;
      }
      const exists = list.some((item) => item.id === selectedArticleId);
      if (!exists) {
        setSelectedArticleId(list[0].id);
      }
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

  const handleDelete = async (versionId: string) => {
    const target = article?.versions.find((v) => v.id === versionId);
    const versionLabel = target ? `v${target.index + 1}` : "選択中のバージョン";
    const confirmed = window.confirm(
      `${versionLabel} を削除します。\nこの操作は取り消せません。`
    );
    if (!confirmed) return;

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
    } catch (err) {
      setDeleteError((err as Error).message || "削除に失敗しました");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-emerald-50 via-white to-white">
      <div className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[320px,1fr]">
        <section className="rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-700">記事一覧</h2>
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              onClick={loadSummaries}
              disabled={loading}
            >
              {loading ? "更新中..." : "再読み込み"}
            </Button>
          </div>
          {summaryError && (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {summaryError}
            </p>
          )}
          {!loading && summaries.length === 0 && !summaryError && (
            <p className="mt-3 text-xs text-muted-foreground">まだ保存された記事がありません。</p>
          )}
          <div className="mt-4 space-y-3">
            {summaries.map((item) => {
              const latestRun = item.latest?.checkRun;
              const previousRun = item.previous?.checkRun;
              const trend = computeTrend(latestRun, previousRun);
              const isActive = selectedArticleId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    isActive
                      ? "border-emerald-400 bg-gradient-to-br from-emerald-50 to-white shadow-md"
                      : "border-transparent bg-white/70 hover:border-emerald-200 hover:bg-white"
                  }`}
                  onClick={() => setSelectedArticleId(item.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {item.title || "無題の記事"}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        最終更新: {formatDateTime(item.updatedAt)}
                      </div>
                    </div>
                    <span className={chipClass(isActive)}>v{(item.latest?.index ?? 0) + 1}</span>
                  </div>
                  {latestRun && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600">
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                        <div className="opacity-80">曖昧度スコア</div>
                        <div className="text-sm">{formatScore(latestRun.aimaiScore)}</div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                        <div className="opacity-80">曖昧件数</div>
                        <div className="text-sm">{latestRun.totalCount}</div>
                      </div>
                    </div>
                  )}
                  {trend && previousRun && latestRun && (
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div className={`rounded-lg border px-3 py-2 ${trendClass(trend.countDiff)}`}>
                        <div className="opacity-70">件数</div>
                        <div className="font-mono">
                          {previousRun.totalCount} → {latestRun.totalCount}
                        </div>
                        <div>{formatPercent(trend.countPercent)}</div>
                      </div>
                      <div className={`rounded-lg border px-3 py-2 ${trendClass(trend.scoreDiff)}`}>
                        <div className="opacity-70">スコア</div>
                        <div className="font-mono">
                          {formatScore(previousRun.aimaiScore)} → {formatScore(latestRun.aimaiScore)}
                        </div>
                        <div>{formatPercent(trend.scorePercent, 1)}</div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          {!selectedArticleId ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/60 p-6 text-center text-sm text-muted-foreground">
              記事を選択すると履歴が表示されます。
            </div>
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
              <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {article.title || "無題の記事"}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      作成: {formatDateTime(article.createdAt)} / 更新: {formatDateTime(article.updatedAt)}
                    </p>
                  </div>
                  <div className="grid w-full max-w-sm grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-700">
                      <div className="opacity-80">バージョン数</div>
                      <div className="text-lg font-semibold">{article.versions.length}</div>
                    </div>
                    <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-700">
                      <div className="opacity-80">最新スコア</div>
                      <div className="text-lg font-semibold">
                        {formatScore(article.versions[0]?.checkRun?.aimaiScore)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-emerald-700">バージョン履歴</h3>
                  <div className="flex items-center gap-2">
                    <span className={chipClass(selectedVersions.length === 0)}>未選択</span>
                    <span className={chipClass(selectedVersions.length === 1)}>1 件</span>
                    <span className={chipClass(selectedVersions.length === 2)}>2 件</span>
                  </div>
                </div>
                {deleteError && (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    {deleteError}
                  </p>
                )}
                {article.versions.length === 0 ? (
                  <p className="rounded-xl border border-emerald-100 bg-white p-4 text-sm text-muted-foreground">
                    まだバージョンがありません。
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {article.versions.map((version) => {
                      const run = version.checkRun;
                      const selected = selectedVersions.includes(version.id);
                      return (
                        <div
                          key={version.id}
                          className={`rounded-xl border px-4 py-3 transition-all ${
                            selected
                              ? "border-emerald-400 bg-gradient-to-r from-emerald-50 to-white shadow-sm"
                              : "border-transparent bg-white/80 hover:border-emerald-200"
                          }`}
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                v{version.index + 1} {version.title || ""}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDateTime(version.createdAt)}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                              <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-emerald-700">
                                件数 {run?.totalCount ?? 0}
                              </div>
                              <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-emerald-700">
                                スコア {formatScore(run?.aimaiScore)}
                              </div>
                              {run && (
                                <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-emerald-700">
                                  文字数 {run.charLength}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={selected ? "secondary" : "outline"}
                                size="sm"
                                className={selected ? "bg-emerald-500 text-white hover:bg-emerald-600" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}
                                onClick={() => toggleVersion(version.id)}
                                disabled={deleteLoadingId === version.id}
                              >
                                {selected ? "選択解除" : "比較へ追加"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-600 text-white hover:bg-red-700"
                                onClick={() => handleDelete(version.id)}
                                disabled={deleteLoadingId === version.id}
                              >
                                {deleteLoadingId === version.id ? "削除中..." : "削除"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-emerald-700">Diff</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    onClick={clearSelection}
                  >
                    選択をクリア
                  </Button>
                </div>

                {selectedSummaries.length > 0 && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {selectedSummaries.map((v, idx) => (
                      <div key={v.id} className="rounded-xl border border-emerald-100 bg-emerald-500/5 px-4 py-3 text-xs">
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

                {selectedVersions.length < 2 && (
                  <p className="mt-3 rounded-lg border border-dashed border-emerald-200 bg-white px-4 py-3 text-sm text-muted-foreground">
                    Diff を表示するには 2 つのバージョンを選択してください。
                  </p>
                )}

                {diffError && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {diffError}
                  </p>
                )}

                {diffLoading && !diffError && (
                  <p className="mt-3 text-sm text-muted-foreground">Diff を読み込み中...</p>
                )}

                {diff && !diffError && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-emerald-100">
                    <DiffEditor
                      key={`${diff.left.id}-${diff.right.id}`}
                      height="60vh"
                      language="markdown"
                      original={diff.left.content}
                      modified={diff.right.content}
                      options={{
                        readOnly: true,
                        fontSize: 14,
                        renderSideBySide: true,
                        wordWrap: "on",
                        minimap: { enabled: false },
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
