// @ts-check
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";

export default tseslint.config(
  // Global ignores — applied before any other config
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.tsbuildinfo",
      "**/coverage/**",
      "packages/spike-phpwasm/**",
    ],
  },

  // Base: typescript-eslint recommended (syntax-only, no type-aware rules)
  // Using recommended instead of recommendedTypeChecked to avoid projectService
  // issues across a monorepo with per-package tsconfigs.
  // Type-aware rules can be enabled per-package when ready (Sprint 2 decision).
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },

  // Prettier overrides — must come after all other rules
  prettier,

  // Test files — relaxed rules
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**/*.ts",
      "**/__tests__/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // Admin workspace — React scope
  {
    files: ["admin/**/*.ts", "admin/**/*.tsx"],
    plugins: {
      "react-hooks": reactHooks,
      react,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
);
