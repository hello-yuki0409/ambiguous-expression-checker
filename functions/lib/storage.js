"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageManager = exports.StorageManager = void 0;
const crypto_1 = require("crypto");
const db_1 = require("./db");
function toDate(value) {
    if (value instanceof Date)
        return value;
    if (typeof value === "string" || typeof value === "number") {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime()))
            return d;
    }
    return new Date();
}
function toNumber(value, fallback = 0) {
    const num = typeof value === "number"
        ? value
        : typeof value === "string"
            ? Number(value)
            : fallback;
    return Number.isFinite(num) ? num : fallback;
}
function toNullableString(value) {
    if (value === null || value === undefined)
        return null;
    return String(value);
}
function countCharacters(text) {
    if (!text)
        return 0;
    return Array.from(text).length;
}
function mapFinding(raw) {
    return {
        id: raw.id,
        start: raw.start,
        end: raw.end,
        matchedText: raw.matchedText ?? raw.matched_text ?? "",
        category: raw.category,
        severity: raw.severity,
        reason: toNullableString(raw.reason) ?? null,
        patternId: raw.patternId ?? raw.pattern_id ?? null,
    };
}
function mapCheckRun(raw, contentLength, includeFindings) {
    return {
        id: raw.id,
        aimaiScore: toNumber(raw.aimaiScore),
        totalCount: toNumber(raw.totalCount),
        charLength: toNumber(raw.charLength ?? raw.char_length, contentLength),
        createdAt: toDate(raw.createdAt ?? raw.created_at ?? null),
        findings: includeFindings
            ? (raw.findings ?? []).map((finding) => mapFinding(finding))
            : undefined,
    };
}
function mapVersion(raw, options) {
    const content = raw.content ?? null;
    const contentLength = countCharacters(content);
    return {
        id: raw.id,
        index: toNumber(raw.index),
        title: toNullableString(raw.title),
        content: options.includeContent ? content ?? undefined : undefined,
        createdAt: toDate(raw.createdAt ?? raw.created_at ?? null),
        article: raw.article
            ? { id: raw.article.id, title: toNullableString(raw.article.title) }
            : undefined,
        checkRuns: (raw.checkRuns ?? []).map((run) => mapCheckRun(run, contentLength, options.includeFindings)),
    };
}
function mapArticle(raw, options) {
    return {
        id: raw.id,
        title: toNullableString(raw.title),
        createdAt: toDate(raw.createdAt ?? raw.created_at ?? null),
        updatedAt: toDate(raw.updatedAt ?? raw.updated_at ?? null),
        versions: (raw.versions ?? []).map((version) => mapVersion(version, options)),
    };
}
class PrismaStorage {
    async listArticles(take, skip) {
        const rows = (await db_1.prisma.article.findMany({
            orderBy: { updatedAt: "desc" },
            skip,
            take,
            select: {
                id: true,
                title: true,
                createdAt: true,
                updatedAt: true,
                versions: {
                    orderBy: { index: "desc" },
                    take: 2,
                    select: {
                        id: true,
                        index: true,
                        title: true,
                        content: true,
                        createdAt: true,
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
                },
            },
        }));
        return rows.map((row) => mapArticle(row, { includeContent: false, includeFindings: false }));
    }
    async getArticle(articleId) {
        const row = (await db_1.prisma.article.findUnique({
            where: { id: articleId },
            select: {
                id: true,
                title: true,
                createdAt: true,
                updatedAt: true,
                versions: {
                    orderBy: { index: "desc" },
                    select: {
                        id: true,
                        index: true,
                        title: true,
                        content: true,
                        createdAt: true,
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
                },
            },
        }));
        if (!row)
            return null;
        return mapArticle(row, { includeContent: false, includeFindings: false });
    }
    async getVersion(versionId) {
        const row = (await db_1.prisma.articleVersion.findUnique({
            where: { id: versionId },
            select: {
                id: true,
                index: true,
                title: true,
                content: true,
                createdAt: true,
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
                        findings: {
                            orderBy: { start: "asc" },
                            select: {
                                id: true,
                                start: true,
                                end: true,
                                matchedText: true,
                                category: true,
                                severity: true,
                                reason: true,
                                patternId: true,
                            },
                        },
                    },
                },
            },
        }));
        if (!row)
            return null;
        return mapVersion(row, { includeContent: true, includeFindings: true });
    }
    async saveVersion(payload) {
        const { articleId, title, content, cleanFindings, charLength, totalCount, aimaiScore, } = payload;
        const result = await db_1.prisma.$transaction(async (tx) => {
            let articleRecord = articleId
                ? (await tx.article.findUnique({
                    where: { id: articleId },
                }))
                : null;
            if (articleId && !articleRecord) {
                throw new Error("article_not_found");
            }
            if (!articleRecord) {
                articleRecord = (await tx.article.create({
                    data: { title },
                }));
            }
            else if (title && articleRecord.title !== title) {
                articleRecord = (await tx.article.update({
                    where: { id: articleRecord.id },
                    data: { title },
                }));
            }
            const index = await tx.articleVersion.count({
                where: { articleId: articleRecord.id },
            });
            const version = (await tx.articleVersion.create({
                data: {
                    articleId: articleRecord.id,
                    index,
                    title: title ?? articleRecord.title ?? null,
                    content,
                },
            }));
            const updatedArticle = (await tx.article.update({
                where: { id: articleRecord.id },
                data: { updatedAt: new Date() },
            }));
            const checkRun = (await tx.checkRun.create({
                data: {
                    versionId: version.id,
                    dictionaryId: null,
                    aimaiScore,
                    totalCount,
                    charLength,
                    findings: cleanFindings.length
                        ? {
                            create: cleanFindings.map((f) => ({ ...f })),
                        }
                        : undefined,
                },
            }));
            return {
                articleRecord: updatedArticle,
                version,
                checkRun,
            };
        });
        return {
            articleRecord: {
                id: result.articleRecord.id,
                title: toNullableString(result.articleRecord.title),
                createdAt: toDate(result.articleRecord.createdAt ??
                    result.articleRecord.created_at ??
                    null),
                updatedAt: toDate(result.articleRecord.updatedAt ??
                    result.articleRecord.updated_at ??
                    null),
            },
            version: {
                id: result.version.id,
                articleId: result.version.articleId ??
                    result.version.article_id ??
                    articleId ??
                    result.articleRecord.id,
                index: toNumber(result.version.index),
                title: toNullableString(result.version.title),
                content: result.version.content ?? "",
                createdAt: toDate(result.version.createdAt ?? result.version.created_at ?? null),
            },
            checkRun: {
                id: result.checkRun.id,
                aimaiScore,
                totalCount,
                charLength,
                createdAt: toDate(result.checkRun.createdAt ?? result.checkRun.created_at ?? null),
            },
        };
    }
}
class MemoryStorage {
    constructor() {
        this.articles = new Map();
    }
    ensureArticle(articleId, title) {
        if (articleId) {
            const existing = this.articles.get(articleId);
            if (existing) {
                if (title && existing.title !== title) {
                    existing.title = title;
                }
                return existing;
            }
        }
        const id = articleId ?? (0, crypto_1.randomUUID)();
        const now = new Date();
        const article = {
            id,
            title: title ?? null,
            createdAt: now,
            updatedAt: now,
            versions: [],
        };
        this.articles.set(id, article);
        return article;
    }
    async listArticles(take, skip) {
        const rows = [...this.articles.values()].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        const sliced = rows.slice(skip, skip + take);
        return sliced.map((article) => ({
            id: article.id,
            title: article.title,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
            versions: article.versions
                .slice()
                .sort((a, b) => b.index - a.index)
                .slice(0, 2)
                .map((version) => ({
                id: version.id,
                index: version.index,
                title: version.title,
                createdAt: version.createdAt,
                checkRuns: version.checkRuns.length
                    ? [
                        {
                            ...version.checkRuns[version.checkRuns.length - 1],
                            findings: undefined,
                        },
                    ]
                    : [],
            })),
        }));
    }
    async getArticle(articleId) {
        const article = this.articles.get(articleId);
        if (!article)
            return null;
        return {
            id: article.id,
            title: article.title,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
            versions: article.versions
                .slice()
                .sort((a, b) => b.index - a.index)
                .map((version) => ({
                id: version.id,
                index: version.index,
                title: version.title,
                createdAt: version.createdAt,
                checkRuns: version.checkRuns.length
                    ? [
                        {
                            ...version.checkRuns[version.checkRuns.length - 1],
                            findings: undefined,
                        },
                    ]
                    : [],
            })),
        };
    }
    async getVersion(versionId) {
        for (const article of this.articles.values()) {
            const version = article.versions.find((v) => v.id === versionId);
            if (version) {
                const latest = version.checkRuns[version.checkRuns.length - 1];
                return {
                    id: version.id,
                    index: version.index,
                    title: version.title,
                    content: version.content,
                    createdAt: version.createdAt,
                    article: { id: article.id, title: article.title },
                    checkRuns: latest
                        ? [
                            {
                                ...latest,
                                findings: latest.findings,
                            },
                        ]
                        : [],
                };
            }
        }
        return null;
    }
    async saveVersion(payload) {
        const { articleId, title, content, cleanFindings, charLength, totalCount, aimaiScore, } = payload;
        const article = this.ensureArticle(articleId ?? null, title);
        const versionIndex = article.versions.length;
        const versionId = (0, crypto_1.randomUUID)();
        const createdAt = new Date();
        const findings = cleanFindings.map((f) => ({
            id: (0, crypto_1.randomUUID)(),
            start: f.start,
            end: f.end,
            matchedText: f.matchedText,
            category: f.category,
            severity: f.severity,
            reason: f.reason ?? null,
            patternId: f.patternId ?? null,
        }));
        const checkRun = {
            id: (0, crypto_1.randomUUID)(),
            aimaiScore,
            totalCount,
            charLength,
            createdAt,
            findings,
        };
        const version = {
            id: versionId,
            index: versionIndex,
            title: title ?? article.title,
            content,
            createdAt,
            checkRuns: [checkRun],
        };
        article.versions.push(version);
        article.updatedAt = createdAt;
        if (title && article.title !== title) {
            article.title = title;
        }
        return {
            articleRecord: {
                id: article.id,
                title: article.title,
                createdAt: article.createdAt,
                updatedAt: article.updatedAt,
            },
            version: {
                id: version.id,
                articleId: article.id,
                index: version.index,
                title: version.title,
                content: version.content,
                createdAt: version.createdAt,
            },
            checkRun: {
                id: checkRun.id,
                aimaiScore: checkRun.aimaiScore,
                totalCount: checkRun.totalCount,
                charLength: checkRun.charLength,
                createdAt: checkRun.createdAt,
            },
        };
    }
}
function isPrismaInitializationError(error) {
    if (!error)
        return false;
    const name = error.name;
    const message = error.message ?? "";
    return (name === "PrismaClientInitializationError" ||
        /Tenant or user not found/i.test(message));
}
class StorageManager {
    constructor() {
        this.useMemory = process.env.USE_IN_MEMORY_STORAGE === "true";
        this.prismaAdapter = new PrismaStorage();
        this.memoryAdapter = new MemoryStorage();
        this.warned = false;
    }
    logFallback(error) {
        if (this.warned)
            return;
        this.warned = true;
        console.warn("[storage] Falling back to in-memory storage. Set USE_IN_MEMORY_STORAGE=true to silence this message.", error);
    }
    async run(operation, fallback) {
        if (this.useMemory) {
            return fallback();
        }
        try {
            return await operation();
        }
        catch (error) {
            if (isPrismaInitializationError(error)) {
                this.useMemory = true;
                this.logFallback(error);
                return fallback();
            }
            throw error;
        }
    }
    listArticles(take, skip) {
        return this.run(() => this.prismaAdapter.listArticles(take, skip), () => this.memoryAdapter.listArticles(take, skip));
    }
    getArticle(articleId) {
        return this.run(() => this.prismaAdapter.getArticle(articleId), () => this.memoryAdapter.getArticle(articleId));
    }
    getVersion(versionId) {
        return this.run(() => this.prismaAdapter.getVersion(versionId), () => this.memoryAdapter.getVersion(versionId));
    }
    saveVersion(payload) {
        return this.run(() => this.prismaAdapter.saveVersion(payload), () => this.memoryAdapter.saveVersion(payload));
    }
}
exports.StorageManager = StorageManager;
exports.storageManager = new StorageManager();
