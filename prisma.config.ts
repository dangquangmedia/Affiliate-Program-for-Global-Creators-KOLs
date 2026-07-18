import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "apps/api/prisma/schema.prisma",
  migrations: {
    path: "apps/api/prisma/migrations",
    seed: "prisma db execute --file apps/api/prisma/seed.sql",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
