import * as path from "node:path";
import * as dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// schema 読み込み前に .env を反映する
dotenv.config({ path: path.resolve(process.cwd(), "prisma/.env") });

export default defineConfig({
  schema: path.join(process.cwd(), "prisma", "schema.prisma"),
});
