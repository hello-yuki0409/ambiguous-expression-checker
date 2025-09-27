"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboard = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("./auth");
const db_1 = require("./db");
async function buildSummary(uid) {
    // ひとまず最新のバージョン 2 件を拾う。必要があればあとで絞り込みを調整する。
    const versions = await db_1.prisma.articleVersion.findMany({
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
    const mapEntry = (version) => {
        const latestRun = version.checkRuns[0];
        if (!latestRun)
            return null;
        return {
            versionId: version.id,
            articleId: version.articleId,
            articleTitle: version.article?.title ?? null,
            index: version.index,
            createdAt: latestRun.createdAt ?? version.createdAt,
            aimaiScore: latestRun.aimaiScore,
            totalCount: latestRun.totalCount,
            charLength: latestRun.charLength,
        };
    };
    const latest = mapEntry(versions[0]);
    const previous = versions[1] ? mapEntry(versions[1]) : null;
    let diff = null;
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
exports.dashboard = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
    try {
        if (req.method !== "GET") {
            res.status(405).json({ error: "method_not_allowed" });
            return;
        }
        const decoded = await (0, auth_1.verifyFirebaseToken)(req.headers.authorization);
        const uid = decoded.uid;
        console.log("[dashboard] request", { uid });
        const summary = await buildSummary(uid);
        res.json({
            summary,
            scoreTrend: [], // TODO: ここから追加の集計を埋めていく
            categoryTrend: [],
            frequentPhrases: [],
        });
    }
    catch (error) {
        console.error("[dashboard] unexpected_error", error);
        res.status(500).json({ error: "internal_error" });
    }
});
