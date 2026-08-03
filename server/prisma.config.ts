import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbUrl = `mysql://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASSWORD ?? "")}@${process.env.DB_HOST}:3306/${process.env.DB_NAME}`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
});
