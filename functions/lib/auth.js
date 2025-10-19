"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFirebaseToken = verifyFirebaseToken;
const auth_1 = require("firebase-admin/auth");
const app_1 = require("firebase-admin/app");
// Initialize Firebase Admin SDK once per instance
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
async function verifyFirebaseToken(authorizationHeader) {
    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
        throw new Error("unauthorized");
    }
    const idToken = authorizationHeader.split(" ")[1];
    try {
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(idToken);
        return decoded;
    }
    catch (error) {
        console.error("verifyFirebaseToken failed", error);
        throw new Error("unauthorized");
    }
}
