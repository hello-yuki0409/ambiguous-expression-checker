import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import type { Request, Response } from "express";
import { verifyFirebaseToken } from "./auth";
import { prisma } from "./db";
import {
  storageManager,
  type StoredArticle,
  type StoredCheckRun,
  type StoredVersion,
} from "./storage";

const DATABASE_URL = defineSecret("DATABASE_URL");

type SummaryEntry = {
  versionId: string;
  articleId: string;
  articleTitle: string | null;
  index: number;
  createdAt: Date;
  aimaiScore: number;
  totalCount: number;
  charLength: number;
};

type SummaryPayload = {
  latest: SummaryEntry | null;
  previous: SummaryEntry | null;
  diff: {
    countDiff: number;
    countPercent: number | null;
    scoreDiff: number;
    scorePercent: number | null;
  } | null;
};

type ScoreTrendEntry = {
  runId: string;
  versionId: string;
  articleId: string;
  articleTitle: string | null;
  index: number;
  createdAt: Date;
  aimaiScore: number;
  totalCount: number;
  charLength: number;
};

type CategoryTrendEntry = {
  versionId: string;
  createdAt: Date;
  counts: Record<string, number>;
};

type FrequentPhraseEntry = {
  matchedText: string;
  category: string;
  totalCount: number;
  severityAvg: number;
  lastFoundAt: Date;
};

type DashboardPayload = {
  summary: SummaryPayload;
  scoreTrend: ScoreTrendEntry[];
  categoryTrend: CategoryTrendEntry[];
  frequentPhrases: FrequentPhraseEntry[];
};

// Prisma 直読み経路

async function buildSummary(uid: string): Promise<SummaryPayload> {
  const versions = await prisma.articleVersion.findMany({
    where: { article: { authorId: uid } },
    orderBy: { createdAt: "desc" },
    take: 2,
    include: {
      article: { select: { id: true, title: true } },
      checkRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          aimaiScore: true,
          totalCount: true,
          charLength: true,
          createdAt: true,
        },
      },
    },
  });

  if (versions.length === 0) {
    return { latest: null, previous: null, diff: null };
  }

  const mapEntry = (version: (typeof versions)[number]): SummaryEntry | null => {
    const latestRun = version.checkRuns[0];
    if (!latestRun) return null;
    const createdAt: Date =
      latestRun.createdAt ?? version.createdAt ?? new Date();
    return {
      versionId: version.id,
      articleId: version.articleId,
      articleTitle: version.article?.title ?? null,
      index: version.index,
      createdAt,
      aimaiScore: latestRun.aimaiScore,
      totalCount: latestRun.totalCount,
      charLength: latestRun.charLength,
    };
  };

  const latest = mapEntry(versions[0]);
  const previous = versions[1] ? mapEntry(versions[1]) : null;

  let diff: SummaryPayload["diff"] = null;
  if (latest && previous) {
    const countDiff = latest.totalCount - previous.totalCount;
    const countPercent = previous.totalCount
      ? (countDiff / previous.totalCount) * 100
      : null;
    const scoreDiff = latest.aimaiScore - previous.aimaiScore;
    const scorePercent = previous.aimaiScore
      ? (scoreDiff / previous.aimaiScore) * 100
      : null;
    diff = { countDiff, countPercent, scoreDiff, scorePercent };
  }

  return { latest, previous, diff };
}

async function buildScoreTrend(uid: string): Promise<ScoreTrendEntry[]> {
  const runs = await prisma.checkRun.findMany({
    where: { version: { article: { authorId: uid } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      version: {
        select: {
          id: true,
          articleId: true,
          index: true,
          createdAt: true,
          article: { select: { title: true } },
        },
      },
    },
  });

  if (runs.length === 0) return [];

  return runs
    .map((run: typeof runs[number]) => {
      if (!run.version) return null;
      return {
        runId: run.id,
        versionId: run.versionId,
        articleId: run.version.articleId,
        articleTitle: run.version.article?.title ?? null,
        index: run.version.index,
        createdAt: run.createdAt,
        aimaiScore: run.aimaiScore,
        totalCount: run.totalCount,
        charLength: run.charLength,
      } as ScoreTrendEntry;
    })
    .filter((entry: ScoreTrendEntry | null): entry is ScoreTrendEntry => entry !== null)
    .reverse();
}

async function buildCategoryTrend(uid: string): Promise<CategoryTrendEntry[]> {
  const versions = await prisma.articleVersion.findMany({
    where: { article: { authorId: uid } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      createdAt: true,
      checkRuns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          findings: { select: { category: true } },
          createdAt: true,
        },
      },
    },
  });

  if (versions.length === 0) return [];

  const entries: Array<CategoryTrendEntry | null> = versions.map(
    (version: typeof versions[number]) => {
      const latestRun = version.checkRuns[0];
      if (!latestRun) return null;

      const counts: Record<string, number> = {};
      latestRun.findings.forEach((finding: { category: string }) => {
        counts[finding.category] = (counts[finding.category] ?? 0) + 1;
      });

      return {
        versionId: version.id,
        createdAt: latestRun.createdAt ?? version.createdAt,
        counts,
      };
    }
  );

  return entries
    .filter(
      (entry: CategoryTrendEntry | null): entry is CategoryTrendEntry =>
        entry !== null
    )
    .reverse();
}

async function buildFrequentPhrases(uid: string): Promise<FrequentPhraseEntry[]> {
  const findings = await prisma.finding.findMany({
    where: { run: { version: { article: { authorId: uid } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      matchedText: true,
      category: true,
      severity: true,
      createdAt: true,
    },
  });

  if (findings.length === 0) return [];

  type BucketValue = {
    matchedText: string;
    category: string;
    totalCount: number;
    severitySum: number;
    lastFoundAt: Date;
  };

  const bucket = new Map<string, BucketValue>();

  findings.forEach(
    (finding: {
      matchedText: string;
      category: string;
      severity: number;
      createdAt: Date;
    }) => {
      const key = `${finding.category}__${finding.matchedText}`;
      const existing = bucket.get(key);
      if (!existing) {
        bucket.set(key, {
          matchedText: finding.matchedText,
          category: finding.category,
          totalCount: 1,
          severitySum: finding.severity,
          lastFoundAt: finding.createdAt,
        });
      } else {
        existing.totalCount += 1;
        existing.severitySum += finding.severity;
        if (existing.lastFoundAt < finding.createdAt) {
          existing.lastFoundAt = finding.createdAt;
        }
      }
    }
  );

  const entries: FrequentPhraseEntry[] = [...bucket.values()]
    .map((value: BucketValue): FrequentPhraseEntry => ({
      matchedText: value.matchedText,
      category: value.category,
      totalCount: value.totalCount,
      severityAvg: value.severitySum / value.totalCount,
      lastFoundAt: value.lastFoundAt,
    }))
    .sort((a: FrequentPhraseEntry, b: FrequentPhraseEntry) => {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return b.lastFoundAt.getTime() - a.lastFoundAt.getTime();
    })
    .slice(0, 10);

  return entries;
}

// Prisma 不通時のフォールバック

function isPrismaUnavailable(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: string }).name;
  if (name === "PrismaClientInitializationError") return true;
  const message = (error as { message?: string }).message ?? "";
  if (/Tenant or user not found/i.test(message)) return true;
  const code = (error as { code?: string | number }).code;
  return code === "ECONNREFUSED";
}

type VersionSnapshot = {
  versionId: string;
  articleId: string;
  articleTitle: string | null;
  index: number;
  createdAt: Date;
  checkRun: StoredCheckRun | null;
};

async function loadArticlesFromMemory(uid: string): Promise<StoredArticle[]> {
  const TAKE = 50;
  const articles = (await storageManager.listArticles(TAKE, 0, uid)) as StoredArticle[];
  return articles;
}

function createSnapshots(articles: StoredArticle[]): VersionSnapshot[] {
  const snapshots: VersionSnapshot[] = [];
  for (const article of articles) {
    for (const version of article.versions) {
      const checkRun = version.checkRuns[0] ?? null;
      const createdAt =
        version.createdAt instanceof Date
          ? version.createdAt
          : new Date(version.createdAt);
      snapshots.push({
        versionId: version.id,
        articleId: article.id,
        articleTitle: article.title ?? null,
        index: version.index,
        createdAt,
        checkRun,
      });
    }
  }
  snapshots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return snapshots;
}

function mapSummaryEntry(
  snapshot: VersionSnapshot | undefined
): SummaryEntry | null {
  if (!snapshot || !snapshot.checkRun) return null;
  const run = snapshot.checkRun;
  const createdAt =
    run.createdAt instanceof Date ? run.createdAt : new Date(run.createdAt);
  return {
    versionId: snapshot.versionId,
    articleId: snapshot.articleId,
    articleTitle: snapshot.articleTitle,
    index: snapshot.index,
    createdAt,
    aimaiScore: run.aimaiScore,
    totalCount: run.totalCount,
    charLength: run.charLength,
  };
}

function computeDiff(
  latest: SummaryEntry | null,
  previous: SummaryEntry | null
): SummaryPayload["diff"] {
  if (!latest || !previous) return null;
  const countDiff = latest.totalCount - previous.totalCount;
  const countPercent = previous.totalCount
    ? (countDiff / previous.totalCount) * 100
    : null;
  const scoreDiff = latest.aimaiScore - previous.aimaiScore;
  const scorePercent = previous.aimaiScore
    ? (scoreDiff / previous.aimaiScore) * 100
    : null;
  return { countDiff, countPercent, scoreDiff, scorePercent };
}

function buildSummaryFromSnapshots(snapshots: VersionSnapshot[]): SummaryPayload {
  const [latestSnapshot, previousSnapshot] = snapshots;
  const latest = mapSummaryEntry(latestSnapshot);
  const previous = mapSummaryEntry(previousSnapshot);
  return { latest, previous, diff: computeDiff(latest, previous) };
}

function buildScoreTrendFromSnapshots(
  snapshots: VersionSnapshot[]
): ScoreTrendEntry[] {
  const limited = snapshots.filter((s) => s.checkRun).slice(0, 20);
  return limited
    .map((snapshot): ScoreTrendEntry => {
      const run = snapshot.checkRun as StoredCheckRun;
      const createdAt =
        run.createdAt instanceof Date ? run.createdAt : new Date(run.createdAt);
      return {
        runId: run.id,
        versionId: snapshot.versionId,
        articleId: snapshot.articleId,
        articleTitle: snapshot.articleTitle,
        index: snapshot.index,
        createdAt,
        aimaiScore: run.aimaiScore,
        totalCount: run.totalCount,
        charLength: run.charLength,
      };
    })
    .reverse();
}

async function loadVersionDetails(
  uid: string,
  snapshots: VersionSnapshot[]
): Promise<Map<string, StoredVersion>> {
  const uniqueIds = [...new Set(snapshots.map((s) => s.versionId))];
  const detailPairs = await Promise.all(
    uniqueIds.map(async (versionId) => {
      const detail = await storageManager.getVersion(versionId, uid);
      return detail ? ([versionId, detail] as const) : null;
    })
  );
  const map = new Map<string, StoredVersion>();
  for (const pair of detailPairs) {
    if (!pair) continue;
    map.set(pair[0], pair[1]);
  }
  return map;
}

function buildCategoryTrendFromDetails(
  snapshots: VersionSnapshot[],
  details: Map<string, StoredVersion>
): CategoryTrendEntry[] {
  const limited = snapshots.slice(0, 10);
  const entries: CategoryTrendEntry[] = [];

  for (const snapshot of limited) {
    const detail = details.get(snapshot.versionId);
    const run = detail?.checkRuns[0] ?? snapshot.checkRun;
    if (!run) continue;

    const counts: Record<string, number> = {};
    for (const finding of (run.findings ?? []) as Array<{ category: string }>) {
      counts[finding.category] = (counts[finding.category] ?? 0) + 1;
    }

    const createdAt =
      run.createdAt instanceof Date ? run.createdAt : new Date(run.createdAt);

    entries.push({
      versionId: snapshot.versionId,
      createdAt,
      counts,
    });
  }

  return entries.reverse();
}

function buildFrequentPhrasesFromDetails(
  details: Map<string, StoredVersion>
): FrequentPhraseEntry[] {
  if (details.size === 0) return [];

  type BucketValue = {
    matchedText: string;
    category: string;
    totalCount: number;
    severitySum: number;
    lastFoundAt: Date;
  };

  const bucket = new Map<string, BucketValue>();

  for (const version of details.values()) {
    const run = version.checkRuns[0];
    if (!run) continue;

    const runCreatedAt =
      run.createdAt instanceof Date ? run.createdAt : new Date(run.createdAt);

    for (const finding of (run.findings ?? []) as Array<{
      matchedText: string;
      category: string;
      severity: number;
    }>) {
      const key = `${finding.category}__${finding.matchedText}`;
      const existing = bucket.get(key);

      if (!existing) {
        bucket.set(key, {
          matchedText: finding.matchedText,
          category: finding.category,
          totalCount: 1,
          severitySum: finding.severity,
          lastFoundAt: runCreatedAt,
        });
      } else {
        existing.totalCount += 1;
        existing.severitySum += finding.severity;
        if (existing.lastFoundAt < runCreatedAt) {
          existing.lastFoundAt = runCreatedAt;
        }
      }
    }
  }

  const entries: FrequentPhraseEntry[] = [...bucket.values()]
    .map((value: BucketValue): FrequentPhraseEntry => ({
      matchedText: value.matchedText,
      category: value.category,
      totalCount: value.totalCount,
      severityAvg: value.severitySum / value.totalCount,
      lastFoundAt: value.lastFoundAt,
    }))
    .sort((a: FrequentPhraseEntry, b: FrequentPhraseEntry) => {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return b.lastFoundAt.getTime() - a.lastFoundAt.getTime();
    })
    .slice(0, 10);

  return entries;
}

async function buildDashboardFromMemory(uid: string): Promise<DashboardPayload> {
  const articles = await loadArticlesFromMemory(uid);
  if (articles.length === 0) {
    return {
      summary: { latest: null, previous: null, diff: null },
      scoreTrend: [],
      categoryTrend: [],
      frequentPhrases: [],
    };
  }
  const snapshots = createSnapshots(articles);
  const summary = buildSummaryFromSnapshots(snapshots);
  const scoreTrend = buildScoreTrendFromSnapshots(snapshots);
  const details = await loadVersionDetails(uid, snapshots);
  const categoryTrend = buildCategoryTrendFromDetails(snapshots, details);
  const frequentPhrases = buildFrequentPhrasesFromDetails(details);
  return { summary, scoreTrend, categoryTrend, frequentPhrases };
}

// エンドポイント

export const dashboard = onRequest(
  { cors: true, timeoutSeconds: 30, secrets: [DATABASE_URL] },
  async (req: Request, res: Response) => {
    let uid: string | null = null;
    try {
      if (req.method !== "GET") {
        res.status(405).json({ error: "method_not_allowed" });
        return;
      }

      // バインドされた Secret を必要に応じて取り出す場合は以下
      // const _dbUrl = DATABASE_URL.value();

      const decoded = await verifyFirebaseToken(req.headers.authorization);
      uid = decoded.uid;

      // まずは Prisma 直読みを試す
      try {
        const summary = await buildSummary(uid);
        const scoreTrend = await buildScoreTrend(uid);
        const categoryTrend = await buildCategoryTrend(uid);
        const frequentPhrases = await buildFrequentPhrases(uid);
        const payload: DashboardPayload = {
          summary,
          scoreTrend,
          categoryTrend,
          frequentPhrases,
        };
        res.json(payload);
        return;
      } catch (e) {
        if (!isPrismaUnavailable(e)) throw e;
        // フォールバック
        const fallbackPayload = await buildDashboardFromMemory(uid);
        res.json(fallbackPayload);
        return;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "unauthorized" || error.message === "forbidden")
      ) {
        const status = error.message === "forbidden" ? 403 : 401;
        res.status(status).json({ error: error.message });
        return;
      }

      const code = (error as { code?: string | number | symbol }).code;
      if (typeof code === "string" && code.startsWith("auth/")) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }

      console.error("[dashboard] unexpected_error", error);
      res.status(500).json({ error: "internal_error" });
    }
  }
);
