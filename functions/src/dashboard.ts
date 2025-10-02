import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import { verifyFirebaseToken } from "./auth";
import { prisma } from "./db";
import {
  storageManager,
  type StoredArticle,
  type StoredCheckRun,
  type StoredVersion,
} from "./storage";

type SummaryPayload = {
  latest: null | {
    versionId: string;
    articleId: string;
    articleTitle: string | null;
    index: number;
    createdAt: Date;
    aimaiScore: number;
    totalCount: number;
    charLength: number;
  };
  previous: SummaryPayload["latest"];
  diff: null | {
    countDiff: number;
    countPercent: number | null;
    scoreDiff: number;
    scorePercent: number | null;
  };
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

  const mapEntry = (version: (typeof versions)[number]) => {
    const latestRun = version.checkRuns[0];
    if (!latestRun) return null;
    return {
      versionId: version.id,
      articleId: version.articleId,
      articleTitle: version.article?.title ?? null,
      index: version.index,
      createdAt: latestRun.createdAt ?? version.createdAt,
      aimaiScore: latestRun.aimaiScore,
      totalCount: latestRun.totalCount,
      charLength: latestRun.charLength,
    } as SummaryPayload["latest"];
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
    diff = {
      countDiff,
      countPercent,
      scoreDiff,
      scorePercent,
    };
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

  if (!runs.length) {
    return [];
  }

  return runs
    .map((run) => {
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
      } satisfies ScoreTrendEntry;
    })
    .filter((entry): entry is ScoreTrendEntry => entry !== null)
    .reverse();
}

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
          findings: {
            select: {
              category: true,
            },
          },
          createdAt: true,
        },
      },
    },
  });

  if (!versions.length) {
    return [];
  }

  const entries: CategoryTrendEntry[] = versions
    .map((version) => {
      const latestRun = version.checkRuns[0];
      if (!latestRun) return null;

      const counts: Record<string, number> = {};
      latestRun.findings.forEach((finding) => {
        counts[finding.category] = (counts[finding.category] ?? 0) + 1;
      });

      return {
        versionId: version.id,
        createdAt: latestRun.createdAt ?? version.createdAt,
        counts,
      } satisfies CategoryTrendEntry;
    })
    .filter((entry): entry is CategoryTrendEntry => entry !== null)
    .reverse();

  return entries;
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

  if (!findings.length) {
    return [];
  }

  const bucket = new Map<string, {
    matchedText: string;
    category: string;
    totalCount: number;
    severitySum: number;
    lastFoundAt: Date;
  }>();

  findings.forEach((finding) => {
    const key = `${finding.category}__${finding.matchedText}`;
    const entry = bucket.get(key);
    if (!entry) {
      bucket.set(key, {
        matchedText: finding.matchedText,
        category: finding.category,
        totalCount: 1,
        severitySum: finding.severity,
        lastFoundAt: finding.createdAt,
      });
    } else {
      entry.totalCount += 1;
      entry.severitySum += finding.severity;
      if (entry.lastFoundAt < finding.createdAt) {
        entry.lastFoundAt = finding.createdAt;
      }
    }
  });

  const entries: FrequentPhraseEntry[] = [...bucket.values()]
    .map((value) => ({
      matchedText: value.matchedText,
      category: value.category,
      totalCount: value.totalCount,
      severityAvg: value.severitySum / value.totalCount,
      lastFoundAt: value.lastFoundAt,
    }))
    .sort((a, b) => {
      if (b.totalCount !== a.totalCount) {
        return b.totalCount - a.totalCount;
      }
      return b.lastFoundAt.getTime() - a.lastFoundAt.getTime();
    })
    .slice(0, 10);

  return entries;
}

type DashboardPayload = {
  summary: SummaryPayload;
  scoreTrend: ScoreTrendEntry[];
  categoryTrend: CategoryTrendEntry[];
  frequentPhrases: FrequentPhraseEntry[];
};

function isPrismaUnavailable(error: unknown) {
  if (!error) return false;
  const name = (error as { name?: string }).name;
  if (name === "PrismaClientInitializationError") return true;
  const message = (error as { message?: string }).message ?? "";
  if (/Tenant or user not found/i.test(message)) return true;
  const code = (error as { code?: string | number }).code;
  return code === "ECONNREFUSED";
}

async function loadArticlesFromMemory(uid: string) {
  const TAKE = 50;
  const articles = (await storageManager.listArticles(TAKE, 0, uid)) as StoredArticle[];
  return articles;
}

type VersionSnapshot = {
  versionId: string;
  articleId: string;
  articleTitle: string | null;
  index: number;
  createdAt: Date;
  checkRun: StoredCheckRun | null;
};

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

function mapSummaryEntry(snapshot: VersionSnapshot | undefined): SummaryPayload["latest"] {
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
  latest: SummaryPayload["latest"],
  previous: SummaryPayload["latest"]
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
  return {
    countDiff,
    countPercent,
    scoreDiff,
    scorePercent,
  };
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
  const limited = snapshots.filter((snapshot) => snapshot.checkRun).slice(0, 20);
  return limited
    .map((snapshot) => {
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
      } satisfies ScoreTrendEntry;
    })
    .reverse();
}

async function loadVersionDetails(
  uid: string,
  snapshots: VersionSnapshot[]
) {
  const uniqueIds = [...new Set(snapshots.map((snapshot) => snapshot.versionId))];
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
    for (const finding of run.findings ?? []) {
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
  if (!details.size) return [];

  const bucket = new Map<
    string,
    {
      matchedText: string;
      category: string;
      totalCount: number;
      severitySum: number;
      lastFoundAt: Date;
    }
  >();

  for (const version of details.values()) {
    const run = version.checkRuns[0];
    if (!run) continue;

    const runCreatedAt =
      run.createdAt instanceof Date ? run.createdAt : new Date(run.createdAt);

    for (const finding of run.findings ?? []) {
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
    .map((value) => ({
      matchedText: value.matchedText,
      category: value.category,
      totalCount: value.totalCount,
      severityAvg: value.severitySum / value.totalCount,
      lastFoundAt: value.lastFoundAt,
    }))
    .sort((a, b) => {
      if (b.totalCount !== a.totalCount) {
        return b.totalCount - a.totalCount;
      }
      return b.lastFoundAt.getTime() - a.lastFoundAt.getTime();
    })
    .slice(0, 10);

  return entries;
}

async function buildDashboardFromMemory(uid: string): Promise<DashboardPayload> {
  const articles = await loadArticlesFromMemory(uid);
  if (!articles.length) {
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

async function buildDashboardWithPrisma(uid: string): Promise<DashboardPayload> {
  const summary = await buildSummary(uid);
  const scoreTrend = await buildScoreTrend(uid);
  const categoryTrend = await buildCategoryTrend(uid);
  const frequentPhrases = await buildFrequentPhrases(uid);
  return { summary, scoreTrend, categoryTrend, frequentPhrases };
}

export const dashboard = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req: Request, res: Response) => {
    let uid: string | null = null;
    try {
      if (req.method !== "GET") {
        res.status(405).json({ error: "method_not_allowed" });
        return;
      }

      const decoded = await verifyFirebaseToken(req.headers.authorization);
      uid = decoded.uid;
      console.log("[dashboard] request", { uid });

      const payload = await buildDashboardWithPrisma(uid);

      res.json(payload);
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

      if (uid && isPrismaUnavailable(error)) {
        console.warn(
          "[dashboard] prisma unavailable, falling back to memory",
          error
        );
        try {
          const payload = await buildDashboardFromMemory(uid);
          res.json(payload);
          return;
        } catch (fallbackError) {
          console.error(
            "[dashboard] memory fallback failed",
            fallbackError
          );
        }
      }

      console.error("[dashboard] unexpected_error", error);
      res.status(500).json({ error: "internal_error" });
    }
  }
);
