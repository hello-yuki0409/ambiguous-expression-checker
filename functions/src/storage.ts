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
  article?: {
    id: string;
    title: string | null;
    authorLabel: string | null;
    authorId: string | null;
  };
  checkRuns: StoredCheckRun[];
};

export type StoredArticle = {
  id: string;
  title: string | null;
  authorLabel: string | null;
  authorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  versions: StoredVersion[];
};

export type SaveVersionInput = {
  articleId?: string | null;
  title: string | null;
  authorLabel: string | null;
  authorId: string;
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
    authorLabel: string | null;
    authorId: string | null;
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

type RawArticleRef =
  | {
      id: string;
      title?: string | null;
      authorLabel?: string | null;
      authorId?: string | null;
    }
  | null
  | undefined;

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
  authorLabel?: string | null;
  authorId?: string | null;
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
      ? {
          id: raw.article.id,
          title: toNullableString(raw.article.title),
          authorLabel: toNullableString(raw.article.authorLabel),
          authorId: toNullableString(
            (raw.article as { authorId?: string | null })?.authorId
          ),
        }
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
    authorLabel: toNullableString(raw.authorLabel),
    authorId: toNullableString((raw as { authorId?: string | null }).authorId),
    createdAt: toDate(raw.createdAt ?? raw.created_at ?? null),
    updatedAt: toDate(raw.updatedAt ?? raw.updated_at ?? null),
    versions: (raw.versions ?? []).map((version) =>
      mapVersion(version, options)
    ),
  };
}

interface StorageAdapter {
  listArticles(
    take: number,
    skip: number,
    authorId: string
  ): Promise<StoredArticle[]>;
  getArticle(
    articleId: string,
    authorId: string
  ): Promise<StoredArticle | null>;
  getVersion(
    versionId: string,
    authorId: string
  ): Promise<StoredVersion | null>;
  saveVersion(payload: SaveVersionInput): Promise<SaveVersionResult>;
  deleteVersion(versionId: string, authorId: string): Promise<boolean>;
}

class PrismaStorage implements StorageAdapter {
  async listArticles(
    take: number,
    skip: number,
    authorId: string
  ): Promise<StoredArticle[]> {
    const rows = (await prisma.article.findMany({
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
    } as unknown as Parameters<typeof prisma.article.findMany>[0])) as RawArticle[];

    return rows.map((row) =>
      mapArticle(row, { includeContent: false, includeFindings: false })
    );
  }

  async getArticle(
    articleId: string,
    authorId: string
  ): Promise<StoredArticle | null> {
    const row = (await prisma.article.findFirst({
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
    } as unknown as Parameters<typeof prisma.article.findFirst>[0])) as RawArticle | null;

    if (!row) return null;
    return mapArticle(row, { includeContent: false, includeFindings: false });
  }

  async getVersion(
    versionId: string,
    authorId: string
  ): Promise<StoredVersion | null> {
    const select = {
      id: true,
      index: true,
      title: true,
      content: true,
      createdAt: true,
      articleId: true,
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
    } as const;

    const convert = (raw: RawVersion | null) =>
      raw ? mapVersion(raw, { includeContent: true, includeFindings: true }) : null;

    const owned = (await prisma.articleVersion.findFirst({
      where: { id: versionId, article: { authorId } },
      select,
    } as unknown as Parameters<typeof prisma.articleVersion.findFirst>[0])) as RawVersion | null;
    if (owned) {
      return convert(owned);
    }

    const candidate = (await prisma.articleVersion.findFirst({
      where: { id: versionId },
      select,
    } as unknown as Parameters<typeof prisma.articleVersion.findFirst>[0])) as RawVersion | null;

    if (!candidate) {
      return null;
    }

    const articleId =
      candidate.articleId ??
      (candidate as unknown as { article_id?: string | null }).article_id ??
      null;
    const currentAuthorId = candidate.article?.authorId ?? null;

    if (currentAuthorId && currentAuthorId !== authorId) {
      return null;
    }

    if (!articleId) {
      return convert(candidate);
    }

    if (!currentAuthorId) {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.user.upsert({
          where: { id: authorId },
          update: {},
          create: { id: authorId, authorLabel: null },
        } as unknown as Parameters<typeof tx.user.upsert>[0]);

        await tx.article.update({
          where: { id: articleId },
          data: { author: { connect: { id: authorId } } },
        } as unknown as Parameters<typeof tx.article.update>[0]);
      });

      const claimed = (await prisma.articleVersion.findFirst({
        where: { id: versionId, article: { authorId } },
        select,
      } as unknown as Parameters<typeof prisma.articleVersion.findFirst>[0])) as RawVersion | null;

      return convert(claimed ?? candidate);
    }

    return convert(candidate);
  }

  async saveVersion(payload: SaveVersionInput): Promise<SaveVersionResult> {
    const {
      articleId,
      title,
      authorLabel,
      authorId,
      content,
      cleanFindings,
      charLength,
      totalCount,
      aimaiScore,
    } = payload;

    if (!authorId) {
      throw new Error("unauthorized");
    }

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const normalisedLabel = authorLabel ?? null;

        await tx.user.upsert({
          where: { id: authorId },
          update: { authorLabel: normalisedLabel },
          create: { id: authorId, authorLabel: normalisedLabel },
        } as unknown as Parameters<typeof tx.user.upsert>[0]);

        let articleRecord: RawArticle | null = null;

        if (articleId) {
          articleRecord = (await tx.article.findUnique({
            where: { id: articleId },
          } as unknown as Parameters<typeof tx.article.findUnique>[0])) as RawArticle | null;

          if (!articleRecord) {
            throw new Error("article_not_found");
          }

          const currentAuthorId =
            (articleRecord as unknown as { authorId?: string | null })
              .authorId ?? null;
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
          } as unknown as Parameters<typeof tx.article.create>[0])) as RawArticle;
        } else {
          const updateData: Prisma.ArticleUpdateInput = {};

          if (title !== undefined && title !== articleRecord.title) {
            updateData.title = title;
          }

          const currentLabel =
            (articleRecord as unknown as { authorLabel?: string | null })
              .authorLabel ?? null;
          if (normalisedLabel !== currentLabel) {
            updateData.authorLabel = normalisedLabel;
          }

          const currentAuthorId =
            (articleRecord as unknown as { authorId?: string | null })
              .authorId ?? null;
          if (currentAuthorId !== authorId) {
            updateData.author = { connect: { id: authorId } };
          }

          if (Object.keys(updateData).length > 0) {
            articleRecord = (await tx.article.update({
              where: { id: articleRecord.id },
              data: updateData,
            } as unknown as Parameters<typeof tx.article.update>[0])) as RawArticle;
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
        authorLabel: toNullableString(
          (result.articleRecord as unknown as { authorLabel?: string | null })
            .authorLabel ?? null
        ),
        authorId: toNullableString(
          (result.articleRecord as unknown as { authorId?: string | null })
            .authorId ?? null
        ),
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

  async deleteVersion(versionId: string, authorId: string): Promise<boolean> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const version = (await tx.articleVersion.findFirst({
        where: { id: versionId, article: { authorId } },
        select: {
          id: true,
          articleId: true,
          checkRuns: { select: { id: true } },
        },
      } as unknown as Parameters<typeof tx.articleVersion.findFirst>[0])) as
        | (RawVersion & {
            articleId?: string | null;
            checkRuns?: { id: string }[];
          })
        | null;

      if (!version) {
        return false;
      }

      const checkRunIds = (version.checkRuns ?? []).map((run) => run.id);
      if (checkRunIds.length > 0) {
        await tx.finding.deleteMany({
          where: { runId: { in: checkRunIds } },
        } as unknown as Parameters<typeof tx.finding.deleteMany>[0]);
        await tx.checkRun.deleteMany({
          where: { id: { in: checkRunIds } },
        } as unknown as Parameters<typeof tx.checkRun.deleteMany>[0]);
      }

      await tx.articleVersion.delete({
        where: { id: versionId },
      } as unknown as Parameters<typeof tx.articleVersion.delete>[0]);

      if (version.articleId) {
        await tx.article.update({
          where: { id: version.articleId },
          data: { updatedAt: new Date() },
        } as unknown as Parameters<typeof tx.article.update>[0]);
      }

      return true;
    });
  }
}

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
  authorLabel: string | null;
  authorId: string | null;
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
  authorId: string;
};

class MemoryStorage implements StorageAdapter {
  private articles = new Map<string, MemoryArticle>();

  private ensureArticle(
    articleId: string | null | undefined,
    title: string | null,
    authorLabel?: string | null,
    authorId?: string | null
  ) {
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

    const id = articleId ?? randomUUID();
    const now = new Date();
    const article: MemoryArticle = {
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

  async listArticles(
    take: number,
    skip: number,
    authorId: string
  ): Promise<StoredArticle[]> {
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

  async getArticle(
    articleId: string,
    authorId: string
  ): Promise<StoredArticle | null> {
    const article = this.articles.get(articleId);
    if (!article || article.authorId !== authorId) return null;
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

  async getVersion(
    versionId: string,
    authorId: string
  ): Promise<StoredVersion | null> {
    for (const article of this.articles.values()) {
      if (article.authorId !== authorId) continue;
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

    const article = this.ensureArticle(
      articleId ?? null,
      title,
      payload.authorLabel,
      payload.authorId
    );
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

  upsertSnapshot(snapshot: SnapshotInput) {
    const storedVersion: StoredVersion = {
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
        authorLabel: snapshot.article.authorLabel,
        authorId: snapshot.article.authorId ?? snapshot.authorId ?? null,
        createdAt: snapshot.article.createdAt,
        updatedAt: snapshot.article.updatedAt,
        versions: [storedVersion],
      },
    ]);

    this.hydrateVersionDetails(storedVersion);
  }

  hydrateArticles(articles: StoredArticle[]) {
    articles.forEach((articleData) => {
      const target = this.ensureArticle(
        articleData.id,
        articleData.title ?? null,
        articleData.authorLabel ?? null,
        articleData.authorId ?? null
      );
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

  hydrateVersionDetails(version: StoredVersion) {
    const articleInfo = version.article;
    if (!articleInfo) return;
    const target = this.ensureArticle(
      articleInfo.id,
      articleInfo.title ?? null,
      articleInfo.authorLabel ?? null,
      articleInfo.authorId ?? null
    );
    target.updatedAt = version.createdAt;
    target.authorLabel = articleInfo.authorLabel ?? null;
    target.authorId = articleInfo.authorId ?? null;

    const memoryVersion = this.toMemoryVersion(version, true);
    const index = target.versions.findIndex((v) => v.id === memoryVersion.id);
    if (index >= 0) {
      target.versions[index] = memoryVersion;
    } else {
      target.versions.push(memoryVersion);
    }
    target.versions.sort((a, b) => a.index - b.index);
  }

  private toMemoryVersion(
    version: StoredVersion,
    includeFindings: boolean
  ): MemoryVersion {
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

  async deleteVersion(versionId: string, authorId: string): Promise<boolean> {
    for (const article of this.articles.values()) {
      if (article.authorId !== authorId) continue;
      const index = article.versions.findIndex(
        (version) => version.id === versionId
      );
      if (index === -1) continue;

      const [removed] = article.versions.splice(index, 1);
      if (removed) {
        article.updatedAt = new Date();
      }
      return true;
    }
    return false;
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

  async listArticles(take: number, skip: number, authorId: string) {
    const dbResult = await this.tryPrisma(() =>
      this.prismaAdapter.listArticles(take, skip, authorId)
    );
    if (dbResult && (!this.preferMemory || dbResult.length > 0)) {
      this.memoryAdapter.hydrateArticles(dbResult);
      return dbResult;
    }

    const memoryResult = await this.memoryAdapter.listArticles(
      take,
      skip,
      authorId
    );
    if (memoryResult.length > 0) {
      return memoryResult;
    }

    return dbResult ?? memoryResult;
  }

  async getArticle(articleId: string, authorId: string) {
    const dbResult = await this.tryPrisma(() =>
      this.prismaAdapter.getArticle(articleId, authorId)
    );
    if (dbResult) {
      this.memoryAdapter.hydrateArticles([dbResult]);
      return dbResult;
    }
    return this.memoryAdapter.getArticle(articleId, authorId);
  }

  async getVersion(versionId: string, authorId: string) {
    const dbResult = await this.tryPrisma(() =>
      this.prismaAdapter.getVersion(versionId, authorId)
    );
    if (dbResult) {
      this.memoryAdapter.hydrateVersionDetails(dbResult);
      return dbResult;
    }
    return this.memoryAdapter.getVersion(versionId, authorId);
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
        authorId: payload.authorId,
      });
      return dbResult;
    }

    return this.memoryAdapter.saveVersion(payload);
  }

  async deleteVersion(versionId: string, authorId: string) {
    const dbResult = await this.tryPrisma(() =>
      this.prismaAdapter.deleteVersion(versionId, authorId)
    );
    if (dbResult) {
      await this.memoryAdapter.deleteVersion(versionId, authorId);
      return dbResult;
    }

    return this.memoryAdapter.deleteVersion(versionId, authorId);
  }
}

export const storageManager = new StorageManager();
