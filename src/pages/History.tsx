import { useEffect, useMemo, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import {
  fetchArticlesSummary,
  fetchArticleDetail,
  fetchVersionDetail,
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

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "";
  }
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return ` (${sign}${rounded}%)`;
}

type Trend = {
  countDiff: number;
  countPercent: number | null;
  scoreDiff: number;
};

function computeTrend(latest?: VersionSummary["checkRun"], previous?: VersionSummary["checkRun"]) {
  if (!latest || !previous) return null;
  const countDiff = latest.totalCount - previous.totalCount;
  const countPercent =
    previous.totalCount > 0
      ? (countDiff / previous.totalCount) * 100
      : null;
  const scoreDiff = latest.aimaiScore - previous.aimaiScore;
  return { countDiff, countPercent, scoreDiff } satisfies Trend;
}

function trendClass(value: number) {
  if (value < 0) return "text-emerald-600";
  if (value > 0) return "text-red-600";
  return "text-muted-foreground";
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

  const selectedSummaries = useMemo(() => {
    if (!article) return [] as VersionSummary[];
    return selectedVersions
      .map((id) => article.versions.find((v) => v.id === id))
      .filter((v): v is VersionSummary => Boolean(v));
  }, [article, selectedVersions]);

  const loadSummaries = async () => {
    setLoading(true);
    setSummaryError(null);
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

  const swapSelection = () => {
    setSelectedVersions((prev) => {
      if (prev.length !== 2) return prev;
      return [prev[1], prev[0]];
    });
  };

  return (
    <div className="grid grid-cols-12 gap-4 p-6">
      <div className="col-span-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">記事一覧</h2>
          <Button variant="outline" size="sm" onClick={loadSummaries} disabled={loading}>
            {loading ? "更新中..." : "再読み込み"}
          </Button>
        </div>
        {summaryError && (
          <p className="text-sm text-red-600">{summaryError}</p>
        )}
        {!loading && summaries.length === 0 && !summaryError && (
          <p className="text-sm text-muted-foreground">まだ保存された記事がありません。</p>
        )}
        <div className="space-y-2">
          {summaries.map((item) => {
            const latestRun = item.latest?.checkRun;
            const previousRun = item.previous?.checkRun;
            const trend = computeTrend(latestRun, previousRun);
            return (
              <button
                key={item.id}
                type="button"
                className={`w-full text-left border rounded-md p-3 transition hover:border-primary/60 ${
                  selectedArticleId === item.id ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
                onClick={() => setSelectedArticleId(item.id)}
              >
                <div className="font-semibold text-sm">
                  {item.title || "無題の記事"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  最終更新: {formatDateTime(item.updatedAt)}
                </div>
                {latestRun && (
                  <div className="mt-2 text-xs font-mono">
                    最新 スコア {formatScore(latestRun.aimaiScore)} / 件数 {latestRun.totalCount}
                  </div>
                )}
                {trend && previousRun && (
                  <div className={`text-[11px] mt-1 ${trendClass(trend.countDiff)}`}>
                    件数 {previousRun.totalCount} → {latestRun?.totalCount}
                    {formatPercent(trend.countPercent)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="col-span-8 space-y-4">
        {!selectedArticleId ? (
          <p className="text-sm text-muted-foreground">記事を選択すると履歴が表示されます。</p>
        ) : detailLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : detailError ? (
          <p className="text-sm text-red-600">{detailError}</p>
        ) : !article ? (
          <p className="text-sm text-muted-foreground">データが見つかりませんでした。</p>
        ) : (
          <>
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{article.title || "無題の記事"}</h2>
                  <p className="text-xs text-muted-foreground">
                    作成: {formatDateTime(article.createdAt)} / 更新: {formatDateTime(article.updatedAt)}
                  </p>
                </div>
                <div className="text-sm font-mono">
                  {article.versions.length} バージョン
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">バージョン一覧</h3>
              {article.versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">まだバージョンがありません。</p>
              ) : (
                <div className="space-y-2">
                  {article.versions.map((version) => {
                    const run = version.checkRun;
                    const selected = selectedVersions.includes(version.id);
                    return (
                      <div
                        key={version.id}
                        className={`border rounded-md p-3 transition ${
                          selected ? "border-primary ring-1 ring-primary/40" : "border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold">
                              v{version.index + 1} {version.title || ""}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(version.createdAt)}
                            </div>
                          </div>
                          <div className="text-right text-xs font-mono">
                            <div>件数 {run?.totalCount ?? 0}</div>
                            <div>スコア {formatScore(run?.aimaiScore)}</div>
                            {run && <div>文字数 {run.charLength}</div>}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleVersion(version.id)}
                          >
                            {selected ? "選択解除" : "比較へ追加"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Diff</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    選択をクリア
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={swapSelection}
                    disabled={selectedVersions.length !== 2}
                  >
                    入れ替え
                  </Button>
                </div>
              </div>

              {selectedSummaries.length > 0 && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {selectedSummaries.map((v, idx) => (
                    <div key={v.id} className="border rounded-md p-2">
                      <div className="font-semibold">{idx === 0 ? "基準" : "比較"} v{v.index + 1}</div>
                      <div className="text-muted-foreground text-[11px]">
                        {formatDateTime(v.createdAt)}
                      </div>
                      {v.checkRun && (
                        <div className="mt-1 font-mono">
                          件数 {v.checkRun.totalCount} / スコア {formatScore(v.checkRun.aimaiScore)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedVersions.length < 2 && (
                <p className="text-sm text-muted-foreground">
                  Diff を表示するには 2 つのバージョンを選択してください。
                </p>
              )}

              {diffError && <p className="text-sm text-red-600">{diffError}</p>}

              {diffLoading && !diffError && (
                <p className="text-sm text-muted-foreground">Diff を読み込み中...</p>
              )}

              {diff && !diffError && (
                <DiffEditor
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
