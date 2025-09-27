import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import { verifyFirebaseToken } from "./auth";
import { prisma } from "./db";

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

async function buildSummary(uid: string): Promise<SummaryPayload> {
  // ひとまず最新のバージョン 2 件を拾う。必要があればあとで絞り込みを調整する。
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

export const dashboard = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req: Request, res: Response) => {
    try {
      if (req.method !== "GET") {
        res.status(405).json({ error: "method_not_allowed" });
        return;
      }

      const decoded = await verifyFirebaseToken(req.headers.authorization);
      const uid = decoded.uid;
      console.log("[dashboard] request", { uid });

      const summary = await buildSummary(uid);

      res.json({
        summary,
        scoreTrend: [], // ここから追加の集計を埋めていくがんばれ俺
        categoryTrend: [],
        frequentPhrases: [],
      });
    } catch (error) {
      console.error("[dashboard] unexpected_error", error);
      res.status(500).json({ error: "internal_error" });
    }
  }
);
