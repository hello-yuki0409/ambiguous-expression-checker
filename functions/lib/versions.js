"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.versions = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const client_1 = require("@prisma/client");
const storage_1 = require("./storage");
const auth_1 = require("./auth");
// Prisma を直接使っていなくても、storageManager 側で利用する可能性があるためバインド
const DATABASE_URL = (0, params_1.defineSecret)("DATABASE_URL");
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
function extractVersionId(req) {
    const rawPaths = [req.originalUrl, req.url, req.path]
        .map((value) => (typeof value === "string" ? value : ""))
        .filter(Boolean);
    const prefixes = ["/api/versions/", "/versions/"];
    for (const raw of rawPaths) {
        const path = raw.split("?")[0]?.replace(/\/+$/, "") ?? "";
        for (const prefix of prefixes) {
            if (path.startsWith(prefix)) {
                const candidate = path.slice(prefix.length).split("/")[0];
                if (candidate) {
                    return candidate;
                }
            }
        }
    }
    const queryId = typeof req.query.versionId === "string" ? req.query.versionId : null;
    return queryId ?? null;
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
exports.versions = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30, secrets: [DATABASE_URL] }, async (req, res) => {
    try {
        if (req.method === "OPTIONS") {
            res.status(204).end();
            return;
        }
        // Secret はバインド済み。必要に応じて読み出す場合は以下:
        // const dbUrl = DATABASE_URL.value();
        const decoded = await (0, auth_1.verifyFirebaseToken)(req.headers.authorization);
        const uid = decoded.uid;
        if (req.method === "GET") {
            const articleId = typeof req.query.articleId === "string"
                ? req.query.articleId
                : undefined;
            const versionId = typeof req.query.versionId === "string"
                ? req.query.versionId
                : undefined;
            if (versionId) {
                const version = await storage_1.storageManager.getVersion(versionId, uid);
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
                const article = await storage_1.storageManager.getArticle(articleId, uid);
                if (!article) {
                    res.status(404).json({ error: "article_not_found" });
                    return;
                }
                res.json({
                    article: {
                        id: article.id,
                        title: article.title,
                        authorLabel: article.authorLabel,
                        createdAt: article.createdAt,
                        updatedAt: article.updatedAt,
                        versions: article.versions.map(mapVersionSummary),
                    },
                });
                return;
            }
            const toNumberParam = (value) => {
                if (typeof value === "string" && value.trim().length > 0) {
                    const parsed = Number(value);
                    return Number.isFinite(parsed) ? parsed : null;
                }
                return null;
            };
            const parsedTake = toNumberParam(req.query.take);
            const parsedSkip = toNumberParam(req.query.skip);
            const take = Math.min(100, Math.max(1, parsedTake ?? 20));
            const skip = Math.max(0, parsedSkip ?? 0);
            const articles = await storage_1.storageManager.listArticles(take, skip, uid);
            const payload = articles.map((article) => {
                const [latest, previous] = article.versions;
                return {
                    id: article.id,
                    title: article.title,
                    authorLabel: article.authorLabel,
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
            const { articleId, title, content, findings, authorLabel } = req.body ?? {};
            if (!content || !content.trim()) {
                res.status(400).json({ error: "content is required" });
                return;
            }
            const cleanFindings = sanitiseFindings(findings ?? []);
            const charLength = toCharLength(content);
            const totalCount = cleanFindings.length;
            const aimaiScore = charLength > 0 ? (totalCount * 1000) / charLength : 0;
            const articleTitle = title?.trim() || null;
            const rawAuthorLabel = typeof authorLabel === "string" ? authorLabel.trim() : null;
            const articleAuthorLabel = rawAuthorLabel || null;
            const result = await storage_1.storageManager.saveVersion({
                articleId,
                title: articleTitle,
                authorLabel: articleAuthorLabel,
                authorId: uid,
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
                    authorLabel: result.articleRecord.authorLabel,
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
        if (req.method === "DELETE") {
            const articleId = typeof req.query.articleId === "string" ? req.query.articleId : null;
            const versionId = extractVersionId(req);
            if (process.env.NODE_ENV !== "production") {
                console.log("[versions] delete request", JSON.stringify({
                    originalUrl: req.originalUrl,
                    url: req.url,
                    path: req.path,
                    articleId,
                    versionId,
                }));
            }
            if (articleId) {
                const deletedArticle = await storage_1.storageManager.deleteArticle(articleId, uid);
                if (!deletedArticle) {
                    res.status(404).json({ error: "article_not_found" });
                    return;
                }
                res.status(204).end();
                return;
            }
            if (!versionId) {
                res.status(400).json({ error: "version_id_required" });
                return;
            }
            const deleted = await storage_1.storageManager.deleteVersion(versionId, uid);
            if (!deleted) {
                res.status(404).json({ error: "version_not_found" });
                return;
            }
            res.status(204).end();
            return;
        }
        res.status(405).end();
    }
    catch (error) {
        const errorCode = error.code;
        if (error instanceof Error &&
            (error.message === "unauthorized" || error.message === "forbidden")) {
            const status = error.message === "forbidden" ? 403 : 401;
            res.status(status).json({ error: error.message });
            return;
        }
        if (typeof errorCode === "string" &&
            errorCode.startsWith("auth/")) {
            res.status(401).json({ error: "unauthorized" });
            return;
        }
        if (error instanceof Error && error.message === "article_not_found") {
            res.status(404).json({ error: "article_not_found" });
            return;
        }
        console.error(error);
        res.status(500).json({ error: "internal_error" });
    }
});
