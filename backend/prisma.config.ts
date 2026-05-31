import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "../shared/db/prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!
  }
});
