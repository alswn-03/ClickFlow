import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["src/generated", "node_modules"]),
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended, prettier],
    rules: {
      eqeqeq: "error",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);
