// Flat ESLint config shared across the whole workspace. Each package's `lint`
// script runs `eslint .` from its own directory; ESLint walks up to find this
// file, so there is one source of truth for rules.
//
// We deliberately use the syntax-based (non-type-checked) typescript-eslint
// preset: it is fast, needs no per-package `parserOptions.project`, and TypeScript
// itself (via `pnpm typecheck`) already catches type errors. Lint is for the
// things the compiler won't tell you.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/*.tsbuildinfo",
      // Config/build files are CommonJS-ish glue, not product code.
      "**/*.config.js",
      "**/*.config.mjs",
      "**/*.config.cjs",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      // TypeScript handles undefined-identifier checking; `no-undef` here only
      // produces false positives on globals (process, document, etc.).
      "no-undef": "off",
      // Unused vars are a warning, not a build-breaker — prefix with `_` to
      // intentionally ignore (common for unused fn args satisfying an interface).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  // Must come last: turns off every rule that would conflict with Prettier's
  // formatting so the two tools never fight.
  prettier,
);
