const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const globals = require("globals");

module.exports = tseslint.config(
  {
    // Build output, vendored 2015-era code (three.js helpers and the
    // DefinitelyTyped global typings snapshot) and the learner-facing sample
    // scripts (runtime content, not project source) are not linted.
    ignores: ["build/**", "lib/**", "typings/**", "samples/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // The 2016 codebase uses `any` extensively; keep the rule available but
      // don't fail on it while it is migrated away piece by piece.
      "@typescript-eslint/no-explicit-any": "off",

      // `Object` (empty object type) and `Function` are used throughout the
      // worker protocol. Replace with concrete types as the protocol gets
      // typed (see modernisation report).
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",

      // Triple-slash references are what pull the vendored typings snapshot
      // into the compilation; they go away once the project moves to @types.
      "@typescript-eslint/triple-slash-reference": "off",

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Legacy `namespace Common ... export = Common` pattern. Converting to
    // ES module exports touches ~20 import sites and is tracked as a
    // modernisation task (see report).
    files: ["common/WorldInfo.ts"],
    rules: {
      "@typescript-eslint/no-namespace": "off",
    },
  },
);
