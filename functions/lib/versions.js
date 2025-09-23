"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.versions = void 0;
const https_1 = require("firebase-functions/v2/https");
const client_1 = require("@prisma/client");
const storage_1 = require("./storage");
const CATEGORY_SET = new Set(Object.values(client_1.AimaiCategory));
const clampScore = (value) => Math.round(value * 100) / 100;
function toCharLength(text) {
    return Array.from(text).length;
}
function sanitiseFindings(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .map((f) => {
        if (typeof f.start !== "number" ||
            typeof f.end !== "number" ||
            typeof f.text !== "string") {
            return null;
        }
        if (f.start < 0 || f.end < f.start)
            return null;
        if (!CATEGORY_SET.has(f.category))
            return null;
        const severity = Math.max(1, Math.min(3, Math.floor(f.severity ?? 1)));
        return {
            start: f.start,
            end: f.end,
            matchedText: f.text,
            category: f.category,
            severity,
            reason: f.reason ?? null,
            patternId: f.patternId ?? null,
        };
    })
        .filter((f) => f !== null);
}
function mapCheckRun(run) {
    return {
        id: run.id,
        aimaiScore: clampScore(run.aimaiScore),
        totalCount: run.totalCount,
        charLength: run.charLength,
        createdAt: run.createdAt,
    };
}
function mapVersionSummary(version) {
    const latestRun = version.checkRuns[0];
    return {
        id: version.id,
        index: version.index,
        title: version.title,
        createdAt: version.createdAt,
        checkRun: latestRun ? mapCheckRun(latestRun) : null,
    };
}
exports.versions = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
    try {
        if (req.method === "GET") {
            const articleId = typeof req.query.articleId === "string"
                ? req.query.articleId
                : undefined;
            const versionId = typeof req.query.versionId === "string"
                ? req.query.versionId
                : undefined;
            if (versionId) {
                const version = await storage_1.storageManager.getVersion(versionId);
                if (!version) {
                    res.status(404).json({ error: "version_not_found" });
                    return;
                }
                const checkRun = version.checkRuns[0];
                res.json({
                    version: {
                        id: version.id,
                        index: version.index,
                        title: version.title,
                        content: version.content,
                        createdAt: version.createdAt,
                        article: version.article,
                        checkRun: checkRun
                            ? {
                                ...mapCheckRun(checkRun),
                                findings: checkRun.findings,
                            }
                            : null,
                    },
                });
                return;
            }
            if (articleId) {
                const article = await storage_1.storageManager.getArticle(articleId);
                if (!article) {
                    res.status(404).json({ error: "article_not_found" });
                    return;
                }
                res.json({
                    article: {
                        id: article.id,
                        title: article.title,
                        createdAt: article.createdAt,
                        updatedAt: article.updatedAt,
                        versions: article.versions.map(mapVersionSummary),
                    },
                });
                return;
            }
            const articles = await storage_1.storageManager.listArticles();
            const payload = articles.map((article) => {
                const [latest, previous] = article.versions;
                return {
                    id: article.id,
                    title: article.title,
                    createdAt: article.createdAt,
                    updatedAt: article.updatedAt,
                    latest: latest ? mapVersionSummary(latest) : null,
                    previous: previous ? mapVersionSummary(previous) : null,
                };
            });
            res.json({ articles: payload });
            return;
        }
        if (req.method === "POST") {
            const { articleId, title, content, findings } = req.body ?? {};
            if (!content || !content.trim()) {
                res.status(400).json({ error: "content is required" });
                return;
            }
            const cleanFindings = sanitiseFindings(findings ?? []);
            const charLength = toCharLength(content);
            const totalCount = cleanFindings.length;
            const aimaiScore = charLength > 0 ? (totalCount * 1000) / charLength : 0;
            const articleTitle = title?.trim() || null;
            const result = await storage_1.storageManager.saveVersion({
                articleId,
                title: articleTitle,
                content,
                cleanFindings,
                charLength,
                totalCount,
                aimaiScore,
            });
            res.json({
                article: {
                    id: result.articleRecord.id,
                    title: result.articleRecord.title,
                },
                version: {
                    id: result.version.id,
                    index: result.version.index,
                    title: result.version.title,
                    createdAt: result.version.createdAt,
                },
                checkRun: mapCheckRun(result.checkRun),
            });
            return;
        }
        res.status(405).end();
    }
    catch (error) {
        if (error instanceof Error && error.message === "article_not_found") {
            res.status(404).json({ error: "article_not_found" });
            return;
        }
        console.error(error);
        res.status(500).json({ error: "internal_error" });
    }
});
