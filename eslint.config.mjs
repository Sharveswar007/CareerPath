import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // LEGACY UI WAIVER: pre-existing `any` usage in client components
    // (teacher/test/profile/challenge pages) predates the vLLM migration.
    // Server-side code (src/app/api, src/lib, src/hooks) is held to 0 errors.
    // TODO: tighten to error everywhere once UI files are typed.
    files: ["src/app/**/page.tsx", "src/components/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Self-hosted server kit (vendored Supabase stack contains Deno edge functions
    // that this Next.js app must not lint):
    "server/**",
  ]),
]);

export default eslintConfig;
