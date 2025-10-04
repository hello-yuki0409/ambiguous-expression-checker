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
const DEFAULT_MODEL = process.env.OPENAI_REWRITE_MODEL ?? "gpt-4.1-mini";
exports.rewrite = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
    try {
        const { text, context, category, style } = req.body;
        if (!text) {
            res.status(400).json({ error: { message: "text is required" } });
            return;
        }
        const trimmedContext = typeof context === "string" && context.trim().length > 0
            ? context.trim()
            : text;
        const tone = style ?? "敬体";
        const CATEGORY_GUIDANCE = {
            HEDGING: "推量語や断定回避を避け、敬体で断言する結論に書き換えてください。",
            VAGUE: "曖昧な語句を具体的な内容や数値に置き換えてください。情報が足りない場合は明確な理由を添えてください。",
            QUANTITY: "数量表現を具体的な値・範囲・頻度に言い換えてください。難しい場合は理由を明示してください。",
            RESPONSIBILITY: "主体を明確にし、誰が何を行うかを示してください。受動的な言い回しは避けます。",
            OTHER: "より明確で簡潔な表現に整えてください。",
        };
        const categoryHint = (category ? CATEGORY_GUIDANCE[category] : null) ?? CATEGORY_GUIDANCE.OTHER;
        const system = `あなたは日本語の編集者です。文体は常に ${tone} に統一し、曖昧表現を削りながら意味を保った修正案を提案します。出力は JSON のみで行い、余剰なテキストは含めません。`;
        const exampleInput = "# 前後文脈\nいずれにしても、7日間はピルの成分を摂取しない期間を設けているのです。\\n自分にあった休薬期間は、医師と十分に相談したうえで決められるでしょう。\n\n# 言い換え対象\n決められるでしょう。";
        const exampleOutput = '{"rewrite":"決められます。","reason":"断定を避ける表現を取り除き、敬体で明確に言い切りました。"}';
        const user = `以下の条件に従って、指定した抜粋の言い換え案を 1 つだけ提示してください。\n\n# 前後文脈\n${trimmedContext}\n\n# 言い換え対象\n${text}\n\n# 指針\n- 原文と意味内容・事実関係は変えないこと。\n- 敬体（〜です／〜ます）で自然に結論づけること。\n- 同じ結論を保ちつつ曖昧さ・責任回避・数量のぼかしを削ること。\n- カテゴリ指針: ${categoryHint}\n- 原文と完全に同じ文章は避け、最低 1 箇所は改善を含めること。\n\n# 出力形式\n{\n  "rewrite": "書き換え後の文章",\n  "reason": "その書き換えが適切な理由（50文字以内）"\n}\n\n# 例\n${exampleInput}\n\n# 例の出力\n${exampleOutput}`;
        const response = await openai.responses.create({
            model: DEFAULT_MODEL,
            input: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
            temperature: 0.2,
            top_p: 0.8,
            stream: false,
            text: {
                format: {
                    type: "json_schema",
                    name: "RewriteResult",
                    schema: {
                        type: "object",
                        properties: {
                            rewrite: {
                                type: "string",
                                description: "書き換え後の文章。原文より明確で敬体表現に統一された文を 1 つ返す。",
                            },
                            reason: {
                                type: "string",
                                description: "その書き換えが適切な理由 (50 文字以内)",
                            },
                        },
                        required: ["rewrite", "reason"],
                        additionalProperties: false,
                    },
                },
            },
        });
        const rawOutput = response ?? {};
        const firstOutput = rawOutput.output?.[0];
        const firstContent = firstOutput?.content?.[0];
        let parsed = null;
        if (firstContent?.type === "json" && firstContent.json_value) {
            parsed = firstContent.json_value;
        }
        else if (typeof rawOutput.output_text === "string") {
            try {
                parsed = JSON.parse(rawOutput.output_text ?? "");
            }
            catch (parseError) {
                console.warn("[rewrite] JSON parse failed", parseError, rawOutput.output_text);
            }
        }
        const normalisedOriginal = text.trim();
        const candidateText = parsed?.rewrite?.trim();
        const finalRewrite = candidateText && candidateText !== normalisedOriginal ? candidateText : null;
        res.json({
            rewrite: finalRewrite,
            reason: parsed?.reason?.trim() ?? null,
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
