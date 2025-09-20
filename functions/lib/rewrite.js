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
        const { text, style } = req.body;
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
