import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import { prisma } from "./db";

export const versions = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req: Request, res: Response) => {
    try {
      if (req.method === "GET") {
        const items = await prisma.articleVersion.findMany({
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, title: true, createdAt: true },
        });
        res.json({ items });
        return; // Promise<void>
      }

      if (req.method === "POST") {
        const { title, content } = req.body as {
          title?: string;
          content?: string;
        };
        if (!content || content.trim().length === 0) {
          res.status(400).json({ error: "content is required" });
          return;
        }
        const created = await prisma.articleVersion.create({
          data: { title: title ?? null, content },
          select: { id: true, title: true, createdAt: true },
        });
        res.json({ item: created });
        return;
      }

      res.status(405).end(); // method not allowed
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal_error" });
    }
  }
);
