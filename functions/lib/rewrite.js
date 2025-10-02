"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewrite = void 0;
const dotenv = __importStar(require("dotenv"));
// エミュレータの時だけ .env.local をロードする
if (process.env.FUNCTIONS_EMULATOR)
    dotenv.config({ path: ".env.local" });
const https_1 = require("firebase-functions/v2/https");
const openai_1 = __importStar(require("openai"));
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY }); // 必須なので
exports.rewrite = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
    try {
        const { text, context, style } = req.body;
        if (!text) {
            res.status(400).json({ error: { message: "text is required" } });
            return;
        }
        const documentContext = context && typeof context === "string" ? context : text;
        const tone = style ?? "敬体";
        const system = `あなたは日本語の編集者です。文体は ${tone} に統一します。回答は JSON 形式のみで返してください。`;
        const user = `以下の文章全体の文脈を踏まえ、指定した抜粋の言い換え案を 1 つだけ提示してください。\n\n# 全文\n${documentContext}\n\n# 言い換え対象\n${text}\n\n## 出力形式\n{\n  "rewrite": "書き換えた文",\n  "reason": "その書き換えが適切な理由"\n}\n\n* rewrite は原文と意味内容を変えずに、曖昧さを下げつつ自然な日本語にしてください。\n* すでに十分明確な場合は rewrite に原文と同じ表現を入れてかまいません。その場合も reason でそう判断した理由を説明してください。\n* 余計な文章や説明は書かず、必ず JSON のみを返してください。`;
        const out = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
            temperature: 0.2,
        });
        const content = out.choices[0]?.message?.content?.trim() ?? "";
        let parsed = null;
        try {
            parsed = JSON.parse(content);
        }
        catch (parseError) {
            console.warn("[rewrite] JSON parse failed", parseError, content);
        }
        res.json({
            rewrite: parsed?.rewrite ?? content,
            reason: parsed?.reason ?? null,
        });
    }
    catch (e) {
        // 429 などはクライアントに伝える
        if (e instanceof openai_1.APIError && (e.status || e.code)) {
            const status = typeof e.status === "number" ? e.status : 500;
            res
                .status(status)
                .json({ error: { message: e.message, code: e.code ?? "api_error" } });
            return;
        }
        console.error(e);
        res.status(500).json({ error: { message: "internal_error" } });
    }
});
