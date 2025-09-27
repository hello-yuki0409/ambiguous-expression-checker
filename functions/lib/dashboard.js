"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboard = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("./auth");
// TODO: 実際の集計ロジックを入れる
exports.dashboard = (0, https_1.onRequest)({ cors: true, timeoutSeconds: 30 }, async (req, res) => {
    try {
        if (req.method !== "GET") {
            res.status(405).json({ error: "method_not_allowed" });
            return;
        }
        const decoded = await (0, auth_1.verifyFirebaseToken)(req.headers.authorization);
        const uid = decoded.uid;
        console.log("[dashboard] request", { uid });
        res.json({
            summary: null,
            scoreTrend: [],
            categoryTrend: [],
            frequentPhrases: [],
        });
    }
    catch (error) {
        console.error("[dashboard] unexpected_error", error);
        res.status(500).json({ error: "internal_error" });
    }
});
