import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // スキーマの場所を指定
  schema: path.join(process.cwd(), "prisma", "schema.prisma"),
});
