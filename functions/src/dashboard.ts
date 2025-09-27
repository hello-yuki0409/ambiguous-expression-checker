import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import { verifyFirebaseToken } from "./auth";

// TODO: 実際の集計ロジックを入れる
export const dashboard = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req: Request, res: Response) => {
    try {
      if (req.method !== "GET") {
        res.status(405).json({ error: "method_not_allowed" });
        return;
      }

      const decoded = await verifyFirebaseToken(req.headers.authorization);
      const uid = decoded.uid;
      console.log("[dashboard] request", { uid });

      res.json({
        summary: null,
        scoreTrend: [],
        categoryTrend: [],
        frequentPhrases: [],
      });
    } catch (error) {
      console.error("[dashboard] unexpected_error", error);
      res.status(500).json({ error: "internal_error" });
    }
  }
);
