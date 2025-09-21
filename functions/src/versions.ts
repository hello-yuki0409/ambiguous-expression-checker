import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";

export const versions = onRequest(
  { cors: true },
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.method === "GET") {
        // まずは疎通用のダミー
        res.status(200).json({ items: [] });
        return;
      }

      if (req.method === "POST") {
        const { content } = req.body as { content: string };
        if (!content) {
          res.status(400).json({ error: "content is required" });
          return;
        }
        // v0 はまず疎通だけ
        res.status(200).json({ ok: true });
        return;
      }

      res.status(405).end();
      return;
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal_error" });
      return;
    }
  }
);
