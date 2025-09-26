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
            ? {
                id: raw.article.id,
                title: toNullableString(raw.article.title),
                authorLabel: toNullableString(raw.article.authorLabel),
                authorId: toNullableString(raw.article?.authorId),
            }
            : undefined,
        checkRuns: (raw.checkRuns ?? []).map((run) => mapCheckRun(run, contentLength, options.includeFindings)),
    };
}
function mapArticle(raw, options) {
    return {
        id: raw.id,
        title: toNullableString(raw.title),
        authorLabel: toNullableString(raw.authorLabel),
        authorId: toNullableString(raw.authorId),
        createdAt: toDate(raw.createdAt ?? raw.created_at ?? null),
        updatedAt: toDate(raw.updatedAt ?? raw.updated_at ?? null),
        versions: (raw.versions ?? []).map((version) => mapVersion(version, options)),
    };
}
class PrismaStorage {
    async listArticles(take, skip, authorId) {
        const rows = (await db_1.prisma.article.findMany({
            orderBy: { updatedAt: "desc" },
            where: { authorId },
            skip,
            take,
            select: {
                id: true,
                title: true,
                authorLabel: true,
                authorId: true,
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
    async getArticle(articleId, authorId) {
        const row = (await db_1.prisma.article.findFirst({
            where: { id: articleId, authorId },
            select: {
                id: true,
                title: true,
                authorLabel: true,
                authorId: true,
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
    async getVersion(versionId, authorId) {
        const row = (await db_1.prisma.articleVersion.findFirst({
            where: { id: versionId, article: { authorId } },
            select: {
                id: true,
                index: true,
                title: true,
                content: true,
                createdAt: true,
                article: {
                    select: { id: true, title: true, authorLabel: true, authorId: true },
                },
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
        const { articleId, title, authorLabel, authorId, content, cleanFindings, charLength, totalCount, aimaiScore, } = payload;
        if (!authorId) {
            throw new Error("unauthorized");
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            const normalisedLabel = authorLabel ?? null;
            await tx.user.upsert({
                where: { id: authorId },
                update: { authorLabel: normalisedLabel },
                create: { id: authorId, authorLabel: normalisedLabel },
            });
            let articleRecord = null;
            if (articleId) {
                articleRecord = (await tx.article.findUnique({
                    where: { id: articleId },
                }));
                if (!articleRecord) {
                    throw new Error("article_not_found");
                }
                const currentAuthorId = articleRecord.authorId ?? null;
                if (currentAuthorId && currentAuthorId !== authorId) {
                    throw new Error("forbidden");
                }
            }
            if (!articleRecord) {
                articleRecord = (await tx.article.create({
                    data: {
                        title,
                        authorLabel: normalisedLabel,
                        author: { connect: { id: authorId } },
                    },
                }));
            }
            else {
                const updateData = {};
                if (title !== undefined && title !== articleRecord.title) {
                    updateData.title = title;
                }
                const currentLabel = articleRecord
                    .authorLabel ?? null;
                if (normalisedLabel !== currentLabel) {
                    updateData.authorLabel = normalisedLabel;
                }
                const currentAuthorId = articleRecord.authorId ?? null;
                if (currentAuthorId !== authorId) {
                    updateData.author = { connect: { id: authorId } };
                }
                if (Object.keys(updateData).length > 0) {
                    articleRecord = (await tx.article.update({
                        where: { id: articleRecord.id },
                        data: updateData,
                    }));
                }
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
                authorLabel: toNullableString(result.articleRecord
                    .authorLabel ?? null),
                authorId: toNullableString(result.articleRecord
                    .authorId ?? null),
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
    async deleteVersion(versionId, authorId) {
        return db_1.prisma.$transaction(async (tx) => {
            const version = (await tx.articleVersion.findFirst({
                where: { id: versionId, article: { authorId } },
                select: {
                    id: true,
                    articleId: true,
                    checkRuns: { select: { id: true } },
                },
            }));
            if (!version) {
                return false;
            }
            const checkRunIds = (version.checkRuns ?? []).map((run) => run.id);
            if (checkRunIds.length > 0) {
                await tx.finding.deleteMany({
                    where: { runId: { in: checkRunIds } },
                });
                await tx.checkRun.deleteMany({
                    where: { id: { in: checkRunIds } },
                });
            }
            await tx.articleVersion.delete({
                where: { id: versionId },
            });
            if (version.articleId) {
                await tx.article.update({
                    where: { id: version.articleId },
                    data: { updatedAt: new Date() },
                });
            }
            return true;
        });
    }
}
class MemoryStorage {
    constructor() {
        this.articles = new Map();
    }
    ensureArticle(articleId, title, authorLabel, authorId) {
        if (articleId) {
            const existing = this.articles.get(articleId);
            if (existing) {
                if (title !== undefined && existing.title !== title) {
                    existing.title = title;
                }
                if (authorLabel !== undefined && existing.authorLabel !== authorLabel) {
                    existing.authorLabel = authorLabel ?? null;
                }
                if (authorId !== undefined && existing.authorId !== authorId) {
                    existing.authorId = authorId ?? null;
                }
                return existing;
            }
        }
        const id = articleId ?? (0, crypto_1.randomUUID)();
        const now = new Date();
        const article = {
            id,
            title: title ?? null,
            authorLabel: authorLabel ?? null,
            authorId: authorId ?? null,
            createdAt: now,
            updatedAt: now,
            versions: [],
        };
        this.articles.set(id, article);
        return article;
    }
    async listArticles(take, skip, authorId) {
        const rows = [...this.articles.values()]
            .filter((article) => article.authorId === authorId)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        const sliced = rows.slice(skip, skip + take);
        return sliced.map((article) => ({
            id: article.id,
            title: article.title,
            authorLabel: article.authorLabel,
            authorId: article.authorId,
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
    async getArticle(articleId, authorId) {
        const article = this.articles.get(articleId);
        if (!article || article.authorId !== authorId)
            return null;
        return {
            id: article.id,
            title: article.title,
            authorLabel: article.authorLabel,
            authorId: article.authorId,
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
    async getVersion(versionId, authorId) {
        for (const article of this.articles.values()) {
            if (article.authorId !== authorId)
                continue;
            const version = article.versions.find((v) => v.id === versionId);
            if (version) {
                const latest = version.checkRuns[version.checkRuns.length - 1];
                return {
                    id: version.id,
                    index: version.index,
                    title: version.title,
                    content: version.content,
                    createdAt: version.createdAt,
                    article: {
                        id: article.id,
                        title: article.title,
                        authorLabel: article.authorLabel,
                        authorId: article.authorId,
                    },
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
        const article = this.ensureArticle(articleId ?? null, title, payload.authorLabel, payload.authorId);
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
        article.authorId = payload.authorId;
        article.versions.push(version);
        article.updatedAt = createdAt;
        if (title && article.title !== title) {
            article.title = title;
        }
        return {
            articleRecord: {
                id: article.id,
                title: article.title,
                authorLabel: article.authorLabel,
                authorId: article.authorId,
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
    upsertSnapshot(snapshot) {
        const storedVersion = {
            id: snapshot.version.id,
            index: snapshot.version.index,
            title: snapshot.version.title,
            content: snapshot.content,
            createdAt: snapshot.version.createdAt,
            article: {
                id: snapshot.article.id,
                title: snapshot.article.title,
                authorLabel: snapshot.article.authorLabel,
                authorId: snapshot.article.authorId ?? snapshot.authorId ?? null,
            },
            checkRuns: [
                {
                    id: snapshot.checkRun.id,
                    aimaiScore: snapshot.checkRun.aimaiScore,
                    totalCount: snapshot.checkRun.totalCount,
                    charLength: snapshot.checkRun.charLength,
                    createdAt: snapshot.checkRun.createdAt,
                    findings: snapshot.findings.map((f) => ({
                        id: (0, crypto_1.randomUUID)(),
                        start: f.start,
                        end: f.end,
                        matchedText: f.matchedText ?? "",
                        category: String(f.category),
                        severity: Number(f.severity ?? 1),
                        reason: f.reason ?? null,
                        patternId: f.patternId ?? null,
                    })),
                },
            ],
        };
        this.hydrateArticles([
            {
                id: snapshot.article.id,
                title: snapshot.article.title,
                authorLabel: snapshot.article.authorLabel,
                authorId: snapshot.article.authorId ?? snapshot.authorId ?? null,
                createdAt: snapshot.article.createdAt,
                updatedAt: snapshot.article.updatedAt,
                versions: [storedVersion],
            },
        ]);
        this.hydrateVersionDetails(storedVersion);
    }
    hydrateArticles(articles) {
        articles.forEach((articleData) => {
            const target = this.ensureArticle(articleData.id, articleData.title ?? null, articleData.authorLabel ?? null, articleData.authorId ?? null);
            target.title = articleData.title ?? null;
            target.createdAt = articleData.createdAt;
            target.updatedAt = articleData.updatedAt;
            target.authorLabel = articleData.authorLabel ?? null;
            target.authorId = articleData.authorId ?? null;
            const versions = (articleData.versions ?? [])
                .slice()
                .sort((a, b) => a.index - b.index)
                .map((version) => this.toMemoryVersion(version, false));
            if (versions.length > 0) {
                target.versions = versions;
            }
        });
    }
    hydrateVersionDetails(version) {
        const articleInfo = version.article;
        if (!articleInfo)
            return;
        const target = this.ensureArticle(articleInfo.id, articleInfo.title ?? null, articleInfo.authorLabel ?? null, articleInfo.authorId ?? null);
        target.updatedAt = version.createdAt;
        target.authorLabel = articleInfo.authorLabel ?? null;
        target.authorId = articleInfo.authorId ?? null;
        const memoryVersion = this.toMemoryVersion(version, true);
        const index = target.versions.findIndex((v) => v.id === memoryVersion.id);
        if (index >= 0) {
            target.versions[index] = memoryVersion;
        }
        else {
            target.versions.push(memoryVersion);
        }
        target.versions.sort((a, b) => a.index - b.index);
    }
    toMemoryVersion(version, includeFindings) {
        const runs = (version.checkRuns ?? []).map((run) => ({
            id: run.id,
            aimaiScore: run.aimaiScore,
            totalCount: run.totalCount,
            charLength: run.charLength,
            createdAt: run.createdAt,
            findings: includeFindings
                ? (run.findings ?? []).map((f) => ({
                    id: f.id ?? (0, crypto_1.randomUUID)(),
                    start: f.start,
                    end: f.end,
                    matchedText: f.matchedText,
                    category: String(f.category),
                    severity: f.severity,
                    reason: f.reason ?? null,
                    patternId: f.patternId ?? null,
                }))
                : [],
        }));
        return {
            id: version.id,
            index: version.index ?? 0,
            title: version.title ?? null,
            content: version.content ?? "",
            createdAt: version.createdAt,
            checkRuns: runs,
        };
    }
    async deleteVersion(versionId, authorId) {
        for (const article of this.articles.values()) {
            if (article.authorId !== authorId)
                continue;
            const index = article.versions.findIndex((version) => version.id === versionId);
            if (index === -1)
                continue;
            const [removed] = article.versions.splice(index, 1);
            if (removed) {
                article.updatedAt = new Date();
            }
            return true;
        }
        return false;
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
        this.preferMemory = process.env.USE_IN_MEMORY_STORAGE === "true";
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
    async tryPrisma(operation) {
        if (this.preferMemory) {
            return null;
        }
        try {
            return await operation();
        }
        catch (error) {
            if (isPrismaInitializationError(error)) {
                this.logFallback(error);
                return null;
            }
            throw error;
        }
    }
    async listArticles(take, skip, authorId) {
        const dbResult = await this.tryPrisma(() => this.prismaAdapter.listArticles(take, skip, authorId));
        if (dbResult && (!this.preferMemory || dbResult.length > 0)) {
            this.memoryAdapter.hydrateArticles(dbResult);
            return dbResult;
        }
        const memoryResult = await this.memoryAdapter.listArticles(take, skip, authorId);
        if (memoryResult.length > 0) {
            return memoryResult;
        }
        return dbResult ?? memoryResult;
    }
    async getArticle(articleId, authorId) {
        const dbResult = await this.tryPrisma(() => this.prismaAdapter.getArticle(articleId, authorId));
        if (dbResult) {
            this.memoryAdapter.hydrateArticles([dbResult]);
            return dbResult;
        }
        return this.memoryAdapter.getArticle(articleId, authorId);
    }
    async getVersion(versionId, authorId) {
        const dbResult = await this.tryPrisma(() => this.prismaAdapter.getVersion(versionId, authorId));
        if (dbResult) {
            this.memoryAdapter.hydrateVersionDetails(dbResult);
            return dbResult;
        }
        return this.memoryAdapter.getVersion(versionId, authorId);
    }
    async saveVersion(payload) {
        const dbResult = await this.tryPrisma(() => this.prismaAdapter.saveVersion(payload));
        if (dbResult) {
            this.memoryAdapter.upsertSnapshot({
                article: dbResult.articleRecord,
                version: dbResult.version,
                checkRun: dbResult.checkRun,
                content: payload.content,
                findings: payload.cleanFindings,
                authorId: payload.authorId,
            });
            return dbResult;
        }
        return this.memoryAdapter.saveVersion(payload);
    }
    async deleteVersion(versionId, authorId) {
        const dbResult = await this.tryPrisma(() => this.prismaAdapter.deleteVersion(versionId, authorId));
        if (dbResult) {
            await this.memoryAdapter.deleteVersion(versionId, authorId);
            return dbResult;
        }
        return this.memoryAdapter.deleteVersion(versionId, authorId);
    }
}
exports.StorageManager = StorageManager;
exports.storageManager = new StorageManager();
