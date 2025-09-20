import * as dotenv from "dotenv";
// エミュレータの時だけ .env.local をロードする
if (process.env.FUNCTIONS_EMULATOR) dotenv.config({ path: ".env.local" });

import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import OpenAI, { APIError } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }); // 必須なので

export const rewrite = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { text, style } = req.body as {
        text: string;
        style: "敬体" | "常体";
      };
      if (!text) {
        res.status(400).json({ error: { message: "text is required" } });
        return;
      }

      const system = `あなたは日本語の編集者です。文体は ${style} に統一します。`;
      const user = `次の文を必要最小限の修正で 1 案のみ書き直してください。\n---\n${text}`;

      const out = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
      });

      res.json({ candidate: out.choices[0]?.message?.content?.trim() ?? "" });
    } catch (e) {
      // 429 などはクライアントに伝える
      if (e instanceof APIError && (e.status || e.code)) {
        const status = typeof e.status === "number" ? e.status : 500;
        res
          .status(status)
          .json({ error: { message: e.message, code: e.code ?? "api_error" } });
        return;
      }
      console.error(e);
      res.status(500).json({ error: { message: "internal_error" } });
    }
  }
);
