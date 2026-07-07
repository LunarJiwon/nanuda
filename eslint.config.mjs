import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design handoff bundle (prototype markup + the design tool's own runtime) — not
    // application source, see design/README.md.
    "design/**",
    // Cloud Functions is its own separate TypeScript project (own package.json/tsconfig,
    // own `npm run build` = `tsc`) — not part of the Next.js app this config lints.
    "functions/**",
    // Firebase CLI's local deploy cache (bundled/minified Next.js build output it generates
    // when preparing the Hosting frameworks deploy) — not source, and already gitignored.
    ".firebase/**",
  ]),
]);

export default eslintConfig;
