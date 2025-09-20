import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export const rewrite = onRequest(
  { cors: true, timeoutSeconds: 30 },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { text, style } = req.body as {
        text: string;
        style: "敬体" | "常体";
      };

      if (!text) {
        res.status(400).json({ error: "text is required" });
        return;
      }

      const system = `あなたは日本語の編集者です。曖昧表現をできるだけ具体化し、原文の語彙・長さ・意味を保ちます。文体は ${style} に統一します。`;
      const user = `次の文を 1 案だけ、必要最小限の修正で書き直してください。\n---\n${text}`;

      const out = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
      });

      const candidate = out.choices[0]?.message?.content?.trim() ?? "";
      res.json({ candidate });
      return;
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "internal_error" });
      return;
    }
  }
);
