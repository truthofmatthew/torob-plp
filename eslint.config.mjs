import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".cache/**",
    ],
  },
  {
    // Product images come straight from image.torob.com at many sizes; plain
    // <img> with lazy loading avoids proxying third-party images through Vercel.
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default eslintConfig;
