import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "prisma/migrations/**",
      "src/generated/**",
    ],
  },
  {
    // Enforce architecture boundary: the pure domain layer must not depend on
    // UI, persistence, data adapters, or the framework.
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app/*",
                "@/server/*",
                "@/data/*",
                "@/components/*",
                "next",
                "next/*",
                "react",
                "@prisma/client",
              ],
              message:
                "src/domain must stay pure: no UI, persistence, data-adapter, or framework imports.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
