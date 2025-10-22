import { loadEnv } from "./env";
import { PrismaClient } from "@prisma/client";

loadEnv();

function ensureSchemaInUrl() {
  const current = process.env.DATABASE_URL;
  if (!current) return;
  if (/schema=/.test(current)) return;
  const separator = current.includes("?") ? "&" : "?";
  process.env.DATABASE_URL = `${current}${separator}schema=aimai`;
}

// 生成済みを保持
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

// Proxy で初回アクセス時にだけ new PrismaClient() する
let _prisma: PrismaClient | undefined;

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    if (!_prisma) {
      ensureSchemaInUrl();
      _prisma = globalForPrisma.__prisma ?? new PrismaClient();
      if (process.env.NODE_ENV !== "production") {
        globalForPrisma.__prisma = _prisma;
      }
    }

    const value = Reflect.get(_prisma!, prop, receiver);
    return typeof value === "function" ? value.bind(_prisma) : value;
  },
});
