import * as dotenv from "dotenv";
if (process.env.FUNCTIONS_EMULATOR) dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
const g = global as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.FUNCTIONS_EMULATOR) g.prisma = prisma;
