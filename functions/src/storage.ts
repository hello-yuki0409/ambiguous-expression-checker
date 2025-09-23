import { randomUUID } from "crypto";
import type { Prisma, AimaiCategory } from "@prisma/client";
import { prisma } from "./db";

export type CleanFinding = {
  start: number;
  end: number;
  matchedText: string;
  category: AimaiCategory | string;
  severity: number;
  reason?: string | null;
  patternId?: string | null;
};

export type StoredFinding = {
  id: string;
  start: number;
  end: number;
  matchedText: string;
  category: string;
  severity: number;
  reason: string | null;
  patternId: string | null;
};

export type StoredCheckRun = {
  id: string;
  aimaiScore: number;
  totalCount: number;
  charLength: number;
  createdAt: Date;
  findings?: StoredFinding[];
};

export type StoredVersion = {
  id: string;
  index: number;
  title: string | null;
  content?: string;
  createdAt: Date;
  article?: { id: string; title: string | null };
  checkRuns: StoredCheckRun[];
};

export type StoredArticle = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  versions: StoredVersion[];
};

export type SaveVersionInput = {
  articleId?: string | null;
  title: string | null;
  content: string;
  cleanFindings: CleanFinding[];
  charLength: number;
  totalCount: number;
  aimaiScore: number;
};

export type SaveVersionResult = {
  articleRecord: {
    id: string;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  version: {
    id: string;
    articleId: string;
    index: number;
    title: string | null;
    content: string;
    createdAt: Date;
  };
  checkRun: {
    id: string;
    aimaiScore: number;
    totalCount: number;
    charLength: number;
    createdAt: Date;
  };
};

type RawFinding = {
  id: string;
  start: number;
  end: number;
  matchedText?: string | null;
  matched_text?: string | null;
  category: string;
  severity: number;
  reason?: string | null;
  patternId?: string | null;
  pattern_id?: string | null;
};

type RawCheckRun = {
  id: string;
  aimaiScore?: number | null;
  totalCount?: number | null;
  charLength?: number | null;
  char_length?: number | null;
  createdAt?: Date | string | number | null;
  created_at?: Date | string | number | null;
  findings?: RawFinding[];
};

type RawArticleRef = { id: string; title?: string | null } | null | undefined;

type RawVersion = {
  id: string;
  index?: number | null;
  title?: string | null;
  content?: string | null;
  createdAt?: Date | string | number | null;
  created_at?: Date | string | number | null;
  articleId?: string | null;
  article_id?: string | null;
  article?: RawArticleRef;
  checkRuns?: RawCheckRun[];
};

type RawArticle = {
  id: string;
  title?: string | null;
  createdAt?: Date | string | number | null;
  created_at?: Date | string | number | null;
  updatedAt?: Date | string | number | null;
  updated_at?: Date | string | number | null;
  versions?: RawVersion[];
};

function toDate(value: Date | string | number | null | undefined): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function toNumber(value: unknown, fallback = 0): number {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : fallback;
  return Number.isFinite(num) ? num : fallback;
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function countCharacters(text: string | null | undefined): number {
  if (!text) return 0;
  return Array.from(text).length;
}

function mapFinding(raw: RawFinding): StoredFinding {
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

function mapCheckRun(
  raw: RawCheckRun,
  contentLength: number,
  includeFindings: boolean
): StoredCheckRun {
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

function mapVersion(
  raw: RawVersion,
  options: { includeContent: boolean; includeFindings: boolean }
): StoredVersion {
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
    checkRuns: (raw.checkRuns ?? []).map((run) =>
      mapCheckRun(run, contentLength, options.includeFindings)
    ),
  };
}

function mapArticle(
  raw: RawArticle,
  options: { includeContent: boolean; includeFindings: boolean }
): StoredArticle {
  return {
    id: raw.id,
    title: toNullableString(raw.title),
    createdAt: toDate(raw.createdAt ?? raw.created_at ?? null),
    updatedAt: toDate(raw.updatedAt ?? raw.updated_at ?? null),
    versions: (raw.versions ?? []).map((version) =>
      mapVersion(version, options)
    ),
  };
}

interface StorageAdapter {
  listArticles(take: number, skip: number): Promise<StoredArticle[]>;
  getArticle(articleId: string): Promise<StoredArticle | null>;
  getVersion(versionId: string): Promise<StoredVersion | null>;
  saveVersion(payload: SaveVersionInput): Promise<SaveVersionResult>;
}

class PrismaStorage implements StorageAdapter {
  async listArticles(take: number, skip: number): Promise<StoredArticle[]> {
    const rows = (await prisma.article.findMany({
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
    } as unknown as Parameters<typeof prisma.article.findMany>[0])) as RawArticle[];

    return rows.map((row) =>
      mapArticle(row, { includeContent: false, includeFindings: false })
    );
  }

  async getArticle(articleId: string): Promise<StoredArticle | null> {
    const row = (await prisma.article.findUnique({
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
    } as unknown as Parameters<typeof prisma.article.findUnique>[0])) as RawArticle | null;

    if (!row) return null;
    return mapArticle(row, { includeContent: false, includeFindings: false });
  }

  async getVersion(versionId: string): Promise<StoredVersion | null> {
    const row = (await prisma.articleVersion.findUnique({
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
    } as unknown as Parameters<typeof prisma.articleVersion.findUnique>[0])) as RawVersion | null;

    if (!row) return null;
    return mapVersion(row, { includeContent: true, includeFindings: true });
  }

  async saveVersion(payload: SaveVersionInput): Promise<SaveVersionResult> {
    const {
      articleId,
      title,
      content,
      cleanFindings,
      charLength,
      totalCount,
      aimaiScore,
    } = payload;

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        let articleRecord = articleId
          ? ((await tx.article.findUnique({
              where: { id: articleId },
            } as unknown as Parameters<typeof tx.article.findUnique>[0])) as RawArticle | null)
          : null;

        if (articleId && !articleRecord) {
          throw new Error("article_not_found");
        }

        if (!articleRecord) {
          articleRecord = (await tx.article.create({
            data: { title },
          } as unknown as Parameters<typeof tx.article.create>[0])) as RawArticle;
        } else if (title && articleRecord.title !== title) {
          articleRecord = (await tx.article.update({
            where: { id: articleRecord.id },
            data: { title },
          } as unknown as Parameters<typeof tx.article.update>[0])) as RawArticle;
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
        } as unknown as Parameters<typeof tx.articleVersion.create>[0])) as RawVersion;

        const updatedArticle = (await tx.article.update({
          where: { id: articleRecord.id },
          data: { updatedAt: new Date() },
        } as unknown as Parameters<typeof tx.article.update>[0])) as RawArticle;

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
        } as unknown as Parameters<typeof tx.checkRun.create>[0])) as RawCheckRun;

        return {
          articleRecord: updatedArticle,
          version,
          checkRun,
        };
      }
    );

    return {
      articleRecord: {
        id: result.articleRecord.id,
        title: toNullableString(result.articleRecord.title),
        createdAt: toDate(
          result.articleRecord.createdAt ??
            result.articleRecord.created_at ??
            null
        ),
        updatedAt: toDate(
          result.articleRecord.updatedAt ??
            result.articleRecord.updated_at ??
            null
        ),
      },
      version: {
        id: result.version.id,
        articleId:
          result.version.articleId ??
          result.version.article_id ??
          articleId ??
          result.articleRecord.id,
        index: toNumber(result.version.index),
        title: toNullableString(result.version.title),
        content: result.version.content ?? "",
        createdAt: toDate(
          result.version.createdAt ?? result.version.created_at ?? null
        ),
      },
      checkRun: {
        id: result.checkRun.id,
        aimaiScore,
        totalCount,
        charLength,
        createdAt: toDate(
          result.checkRun.createdAt ?? result.checkRun.created_at ?? null
        ),
      },
    };
  }

}

// ---------------------------
// In-memory fallback storage
// ---------------------------

type MemoryCheckRun = StoredCheckRun & { findings: StoredFinding[] };

type MemoryVersion = {
  id: string;
  index: number;
  title: string | null;
  content: string;
  createdAt: Date;
  checkRuns: MemoryCheckRun[];
};

type MemoryArticle = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  versions: MemoryVersion[];
};

type SnapshotInput = {
  article: SaveVersionResult["articleRecord"];
  version: SaveVersionResult["version"];
  checkRun: SaveVersionResult["checkRun"];
  content: string;
  findings: CleanFinding[];
};

class MemoryStorage implements StorageAdapter {
  private articles = new Map<string, MemoryArticle>();

  private ensureArticle(
    articleId: string | null | undefined,
    title: string | null
  ) {
    if (articleId) {
      const existing = this.articles.get(articleId);
      if (existing) {
        if (title && existing.title !== title) {
          existing.title = title;
        }
        return existing;
      }
    }

    const id = articleId ?? randomUUID();
    const now = new Date();
    const article: MemoryArticle = {
      id,
      title: title ?? null,
      createdAt: now,
      updatedAt: now,
      versions: [],
    };
    this.articles.set(id, article);
    return article;
  }

  async listArticles(take: number, skip: number): Promise<StoredArticle[]> {
    const rows = [...this.articles.values()].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
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

  async getArticle(articleId: string): Promise<StoredArticle | null> {
    const article = this.articles.get(articleId);
    if (!article) return null;
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

  async getVersion(versionId: string): Promise<StoredVersion | null> {
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

  async saveVersion(payload: SaveVersionInput): Promise<SaveVersionResult> {
    const {
      articleId,
      title,
      content,
      cleanFindings,
      charLength,
      totalCount,
      aimaiScore,
    } = payload;

    const article = this.ensureArticle(articleId ?? null, title);
    const versionIndex = article.versions.length;
    const versionId = randomUUID();
    const createdAt = new Date();

    const findings: StoredFinding[] = cleanFindings.map((f) => ({
      id: randomUUID(),
      start: f.start,
      end: f.end,
      matchedText: f.matchedText,
      category: f.category,
      severity: f.severity,
      reason: f.reason ?? null,
      patternId: f.patternId ?? null,
    }));

    const checkRun: MemoryCheckRun = {
      id: randomUUID(),
      aimaiScore,
      totalCount,
      charLength,
      createdAt,
      findings,
    };

    const version: MemoryVersion = {
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

  upsertSnapshot(snapshot: SnapshotInput) {
    const storedVersion: StoredVersion = {
      id: snapshot.version.id,
      index: snapshot.version.index,
      title: snapshot.version.title,
      content: snapshot.content,
      createdAt: snapshot.version.createdAt,
      article: { id: snapshot.article.id, title: snapshot.article.title },
      checkRuns: [
        {
          id: snapshot.checkRun.id,
          aimaiScore: snapshot.checkRun.aimaiScore,
          totalCount: snapshot.checkRun.totalCount,
          charLength: snapshot.checkRun.charLength,
          createdAt: snapshot.checkRun.createdAt,
          findings: snapshot.findings.map((f) => ({
            id: randomUUID(),
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
        createdAt: snapshot.article.createdAt,
        updatedAt: snapshot.article.updatedAt,
        versions: [storedVersion],
      },
    ]);

    this.hydrateVersionDetails(storedVersion);
  }

  hydrateArticles(articles: StoredArticle[]) {
    articles.forEach((articleData) => {
      const target = this.ensureArticle(articleData.id, articleData.title ?? null);
      target.title = articleData.title ?? null;
      target.createdAt = articleData.createdAt;
      target.updatedAt = articleData.updatedAt;

      const versions = (articleData.versions ?? [])
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((version) => this.toMemoryVersion(version, false));

      if (versions.length > 0) {
        target.versions = versions;
      }
    });
  }

  hydrateVersionDetails(version: StoredVersion) {
    const articleInfo = version.article;
    if (!articleInfo) return;
    const target = this.ensureArticle(articleInfo.id, articleInfo.title ?? null);
    target.updatedAt = version.createdAt;

    const memoryVersion = this.toMemoryVersion(version, true);
    const index = target.versions.findIndex((v) => v.id === memoryVersion.id);
    if (index >= 0) {
      target.versions[index] = memoryVersion;
    } else {
      target.versions.push(memoryVersion);
    }
    target.versions.sort((a, b) => a.index - b.index);
  }

  private toMemoryVersion(version: StoredVersion, includeFindings: boolean): MemoryVersion {
    const runs = (version.checkRuns ?? []).map((run) => ({
      id: run.id,
      aimaiScore: run.aimaiScore,
      totalCount: run.totalCount,
      charLength: run.charLength,
      createdAt: run.createdAt,
      findings: includeFindings
        ? (run.findings ?? []).map((f) => ({
            id: f.id ?? randomUUID(),
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
}

function isPrismaInitializationError(error: unknown) {
  if (!error) return false;
  const name = (error as { name?: string }).name;
  const message = (error as { message?: string }).message ?? "";
  return (
    name === "PrismaClientInitializationError" ||
    /Tenant or user not found/i.test(message)
  );
}

export class StorageManager {
  private readonly preferMemory = process.env.USE_IN_MEMORY_STORAGE === "true";
  private readonly prismaAdapter = new PrismaStorage();
  private readonly memoryAdapter = new MemoryStorage();
  private warned = false;

  private logFallback(error: unknown) {
    if (this.warned) return;
    this.warned = true;
    console.warn(
      "[storage] Falling back to in-memory storage. Set USE_IN_MEMORY_STORAGE=true to silence this message.",
      error
    );
  }

  private async tryPrisma<T>(operation: () => Promise<T>): Promise<T | null> {
    if (this.preferMemory) {
      return null;
    }
    try {
      return await operation();
    } catch (error) {
      if (isPrismaInitializationError(error)) {
        this.logFallback(error);
        return null;
      }
      throw error;
    }
  }

  async listArticles(take: number, skip: number) {
    const dbResult = await this.tryPrisma(() =>
      this.prismaAdapter.listArticles(take, skip)
    );
    if (dbResult && (!this.preferMemory || dbResult.length > 0)) {
      this.memoryAdapter.hydrateArticles(dbResult);
      return dbResult;
    }

    const memoryResult = await this.memoryAdapter.listArticles(take, skip);
    if (memoryResult.length > 0) {
      return memoryResult;
    }

    return dbResult ?? memoryResult;
  }

  async getArticle(articleId: string) {
    const dbResult = await this.tryPrisma(() =>
      this.prismaAdapter.getArticle(articleId)
    );
    if (dbResult) {
      this.memoryAdapter.hydrateArticles([dbResult]);
      return dbResult;
    }
    return this.memoryAdapter.getArticle(articleId);
  }

  async getVersion(versionId: string) {
    const dbResult = await this.tryPrisma(() =>
      this.prismaAdapter.getVersion(versionId)
    );
    if (dbResult) {
      this.memoryAdapter.hydrateVersionDetails(dbResult);
      return dbResult;
    }
    return this.memoryAdapter.getVersion(versionId);
  }

  async saveVersion(payload: SaveVersionInput) {
    const dbResult = await this.tryPrisma(() =>
      this.prismaAdapter.saveVersion(payload)
    );
    if (dbResult) {
      this.memoryAdapter.upsertSnapshot({
        article: dbResult.articleRecord,
        version: dbResult.version,
        checkRun: dbResult.checkRun,
        content: payload.content,
        findings: payload.cleanFindings,
      });
      return dbResult;
    }

    return this.memoryAdapter.saveVersion(payload);
  }
}

export const storageManager = new StorageManager();
