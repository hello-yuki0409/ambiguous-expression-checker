"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboard = void 0;
const env_1 = require("./env");
(0, env_1.loadEnv)();
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const auth_1 = require("./auth");
const db_1 = require("./db");
const storage_1 = require("./storage");
const DATABASE_URL = (0, params_1.defineSecret)("DATABASE_URL");
// Prisma 直読み経路
async function buildSummary(uid) {
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
        const createdAt = latestRun.createdAt ?? version.createdAt ?? new Date();
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
        diff = { countDiff, countPercent, scoreDiff, scorePercent };
    }
    return { latest, previous, diff };
}
async function buildScoreTrend(uid) {
    const runs = await db_1.prisma.checkRun.findMany({
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
    if (runs.length === 0)
        return [];
    return runs
        .map((run) => {
        if (!run.version)
            return null;
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
        };
    })
        .filter((entry) => entry !== null)
        .reverse();
}
async function buildCategoryTrend(uid) {
    const versions = await db_1.prisma.articleVersion.findMany({
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
    if (versions.length === 0)
        return [];
    const entries = versions.map((version) => {
        const latestRun = version.checkRuns[0];
        if (!latestRun)
            return null;
        const counts = {};
        latestRun.findings.forEach((finding) => {
            counts[finding.category] = (counts[finding.category] ?? 0) + 1;
        });
        return {
            versionId: version.id,
            createdAt: latestRun.createdAt ?? version.createdAt,
            counts,
        };
    });
    return entries
        .filter((entry) => entry !== null)
        .reverse();
}
async function buildFrequentPhrases(uid) {
    const findings = await db_1.prisma.finding.findMany({
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
    if (findings.length === 0)
        return [];
    const bucket = new Map();
    findings.forEach((finding) => {
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
        }
        else {
            existing.totalCount += 1;
            existing.severitySum += finding.severity;
            if (existing.lastFoundAt < finding.createdAt) {
                existing.lastFoundAt = finding.createdAt;
            }
        }
    });
    const entries = [...bucket.values()]
        .map((value) => ({
        matchedText: value.matchedText,
        category: value.category,
        totalCount: value.totalCount,
        severityAvg: value.severitySum / value.totalCount,
        lastFoundAt: value.lastFoundAt,
    }))
        .sort((a, b) => {
        if (b.totalCount !== a.totalCount)
            return b.totalCount - a.totalCount;
        return b.lastFoundAt.getTime() - a.lastFoundAt.getTime();
    })
        .slice(0, 10);
    return entries;
}
// Prisma 不通時のフォールバック
function isPrismaUnavailable(error) {
    if (!error)
        return false;
    const name = error.name;
    if (name === "PrismaClientInitializationError")
        return true;
    const message = error.message ?? "";
    if (/Tenant or user not found/i.test(message))
        return true;
    const code = error.code;
    return code === "ECONNREFUSED";
}
async function loadArticlesFromMemory(uid) {
    const TAKE = 50;
    const articles = (await storage_1.storageManager.listArticles(TAKE, 0, uid));
    return articles;
}
function createSnapshots(articles) {
    const snapshots = [];
    for (const article of articles) {
        for (const version of article.versions) {
            const checkRun = version.checkRuns[0] ?? null;
            const createdAt = version.createdAt instanceof Date
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
function mapSummaryEntry(snapshot) {
    if (!snapshot || !snapshot.checkRun)
        return null;
    const run = snapshot.checkRun;
    const createdAt = run.createdAt instanceof Date ? run.createdAt : new Date(run.createdAt);
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
function computeDiff(latest, previous) {
    if (!latest || !previous)
        return null;
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
function buildSummaryFromSnapshots(snapshots) {
    const [latestSnapshot, previousSnapshot] = snapshots;
    const latest = mapSummaryEntry(latestSnapshot);
    const previous = mapSummaryEntry(previousSnapshot);
    return { latest, previous, diff: computeDiff(latest, previous) };
}
function buildScoreTrendFromSnapshots(snapshots) {
    const limited = snapshots.filter((s) => s.checkRun).slice(0, 20);
    return limited
        .map((snapshot) => {
        const run = snapshot.checkRun;
        const createdAt = run.createdAt instanceof Date ? run.createdAt : new Date(run.createdAt);
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
async function loadVersionDetails(uid, snapshots) {
    const uniqueIds = [...new Set(snapshots.map((s) => s.versionId))];
    const detailPairs = await Promise.all(uniqueIds.map(async (versionId) => {
        const detail = await storage_1.storageManager.getVersion(versionId, uid);
        return detail ? [versionId, detail] : null;
    }));
    const map = new Map();
    for (const pair of detailPairs) {
        if (!pair)
            continue;
        map.set(pair[0], pair[1]);
    }
    return map;
}
function buildCategoryTrendFromDetails(snapshots, details) {
    const limited = snapshots.slice(0, 10);
    const entries = [];
    for (const snapshot of limited) {
        const detail = details.get(snapshot.versionId);
        const run = detail?.checkRuns[0] ?? snapshot.checkRun;
        if (!run)
            continue;
        const counts = {};
        for (const finding of (run.findings ?? [])) {
            counts[finding.category] = (counts[finding.category] ?? 0) + 1;
        }
        const createdAt = run.createdAt instanceof Date ? run.createdAt : new Date(run.createdAt);
        entries.push({
            versionId: snapshot.versionId,
            createdAt,
            counts,
        });
    }
    return entries.reverse();
}
function buildFrequentPhrasesFromDetails(details) {
    if (details.size === 0)
        return [];
    const bucket = new Map();
    for (const version of details.values()) {
        const run = version.checkRuns[0];
        if (!run)
            continue;
        const runCreatedAt = run.createdAt instanceof Date ? run.createdAt : new Date(run.createdAt);
        for (const finding of (run.findings ?? [])) {
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
            }
            else {
                existing.totalCount += 1;
                existing.severitySum += finding.severity;
                if (existing.lastFoundAt < runCreatedAt) {
                    existing.lastFoundAt = runCreatedAt;
                }
            }
        }
    }
    const entries = [...bucket.values()]
        .map((value) => ({
        matchedText: value.matchedText,
        category: value.category,
        totalCount: value.totalCount,
        severityAvg: value.severitySum / value.totalCount,
        lastFoundAt: value.lastFoundAt,
    }))
        .sort((a, b) => {
        if (b.totalCount !== a.totalCount)
            return b.totalCount - a.totalCount;
        return b.lastFoundAt.getTime() - a.lastFoundAt.getTime();
    })
        .slice(0, 10);
    return entries;
}
async function buildDashboardFromMemory(uid) {
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
exports.dashboard = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30, secrets: [DATABASE_URL] }, async (req, res) => {
    let uid = null;
    try {
        const dbUrl = DATABASE_URL.value();
        if (dbUrl) {
            process.env.DATABASE_URL = dbUrl;
        }
        if (req.method !== "GET") {
            res.status(405).json({ error: "method_not_allowed" });
            return;
        }
        const decoded = await (0, auth_1.verifyFirebaseToken)(req.headers.authorization);
        uid = decoded.uid;
        // まずは Prisma 直読みを試す
        try {
            const summary = await buildSummary(uid);
            const scoreTrend = await buildScoreTrend(uid);
            const categoryTrend = await buildCategoryTrend(uid);
            const frequentPhrases = await buildFrequentPhrases(uid);
            const payload = {
                summary,
                scoreTrend,
                categoryTrend,
                frequentPhrases,
            };
            res.json(payload);
            return;
        }
        catch (e) {
            if (!isPrismaUnavailable(e))
                throw e;
            // フォールバック
            const fallbackPayload = await buildDashboardFromMemory(uid);
            res.json(fallbackPayload);
            return;
        }
    }
    catch (error) {
        if (error instanceof Error &&
            (error.message === "unauthorized" || error.message === "forbidden")) {
            const status = error.message === "forbidden" ? 403 : 401;
            res.status(status).json({ error: error.message });
            return;
        }
        const code = error.code;
        if (typeof code === "string" && code.startsWith("auth/")) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        console.error("[dashboard] unexpected_error", error);
        res.status(500).json({ error: "internal_error" });
    }
});
