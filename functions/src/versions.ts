import { onRequest } from "firebase-functions/v2/https";
import { prisma } from "./db";

export const createVersion = onRequest(
  { cors: true },
  async (req, res): Promise<void> => {
    if (req.method !== "POST") {
      res.status(405).end(); // return しない / Response を返さない
      return;
    }

    const { articleId, title, content } = (req.body ?? {}) as {
      articleId?: string;
      title?: string;
      content?: string;
    };

    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    try {
      // 記事を用意（新規 or 既存）
      const article = articleId
        ? await prisma.article.update({
            where: { id: articleId },
            data: { updatedAt: new Date() },
          })
        : await prisma.article.create({
            data: { title: title ?? null },
          });

      // 連番 index を採番
      const latest = await prisma.articleVersion.aggregate({
        where: { articleId: article.id },
        _max: { index: true },
      });

      const version = await prisma.articleVersion.create({
        data: {
          articleId: article.id,
          index: (latest._max.index ?? -1) + 1,
          content,
        },
        select: { id: true, articleId: true, index: true, createdAt: true },
      });

      res.status(200).json({ ok: true, ...version });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal_error" });
    }
  }
);

// GET /versions?articleId=xxx
export const listVersions = onRequest(
  { cors: true },
  async (req, res): Promise<void> => {
    if (req.method !== "GET") {
      res.status(405).end();
      return;
    }
    try {
      const articleId =
        (req.query?.articleId as string | undefined) ?? undefined;
      const where = articleId ? { articleId } : undefined;

      const versions = await prisma.articleVersion.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        take: 50,
        select: { id: true, articleId: true, index: true, createdAt: true },
      });

      res.status(200).json({ versions });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal_error" });
    }
  }
);
