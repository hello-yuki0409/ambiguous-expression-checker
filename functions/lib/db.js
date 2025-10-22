"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const env_1 = require("./env");
const client_1 = require("@prisma/client");
(0, env_1.loadEnv)();
function ensureSchemaInUrl() {
    const current = process.env.DATABASE_URL;
    if (!current)
        return;
    if (/schema=/.test(current))
        return;
    const separator = current.includes("?") ? "&" : "?";
    process.env.DATABASE_URL = `${current}${separator}schema=aimai`;
}
// 生成済みを保持
const globalForPrisma = globalThis;
// Proxy で初回アクセス時にだけ new PrismaClient() する
let _prisma;
exports.prisma = new Proxy({}, {
    get(_target, prop, receiver) {
        if (!_prisma) {
            ensureSchemaInUrl();
            _prisma = globalForPrisma.__prisma ?? new client_1.PrismaClient();
            if (process.env.NODE_ENV !== "production") {
                globalForPrisma.__prisma = _prisma;
            }
        }
        const value = Reflect.get(_prisma, prop, receiver);
        return typeof value === "function" ? value.bind(_prisma) : value;
    },
});
