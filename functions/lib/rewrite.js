"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewrite = void 0;
const https_1 = require("firebase-functions/v2/https");
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
exports.rewrite = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
    try {
        const { text, style } = req.body;
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
        return;
    }
});
