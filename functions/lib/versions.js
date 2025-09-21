"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.versions = void 0;
const https_1 = require("firebase-functions/v2/https");
exports.versions = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    try {
        if (req.method === "GET") {
            // まずは疎通用のダミー
            res.status(200).json({ items: [] });
            return;
        }
        if (req.method === "POST") {
            const { content } = req.body;
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
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: "internal_error" });
        return;
    }
});
