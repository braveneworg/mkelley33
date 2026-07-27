/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importX from 'eslint-plugin-import-x';
import nextPlugin from '@next/eslint-plugin-next';
import security from 'eslint-plugin-security';
import globals from 'globals';
import unusedImports from 'eslint-plugin-unused-imports';
import preferArrowFunctions from 'eslint-plugin-prefer-arrow-functions';
import vitest from '@vitest/eslint-plugin';
import pluginQuery from '@tanstack/eslint-plugin-query';
import betterTailwind from 'eslint-plugin-better-tailwindcss';

// typescript-eslint's recommended preset ships as an array of flat-config objects:
// [0] base (registers parser/plugin), [1] eslint-recommended (disables core rules TS
// already covers), [2] the recommended rule set. We apply [1] + [2]'s rules in a
// TS-scoped block below; the plugin itself is registered in the main config block.
const tsEslintRecommendedRules = Object.assign(
  {},
  ...tseslint.configs.recommended.filter((config) => config.rules).map((config) => config.rules)
);

const eslintConfig = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/.vitest/**',
      '**/backups/**',
      'next-env.d.ts',
      'tsconfig.json',
      'tsconfig.*.json',
      'eslint.config.mjs',
      'vite.config.ts',
      'vitest.config.ts',
      'jest.config.ts',
      'postcss.config.mjs',
      '**/*.css',
      '**/*.md',
      '**/*.json',
      '**/*.d.ts',
      // Auto-generated docs build scripts mix Node and browser (page.evaluate) globals.
      'docs/**/*.mjs',
      '**/.claude/**',
      // Agent scratch/workspace directory (gitignored; not project source).
      '**/.superpowers/**',
      // Static assets served as-is, including the hand-written service worker
      // which relies on ServiceWorkerGlobalScope globals that ESLint can't see.
      'public/**',
    ],
  },
  // Base JavaScript rules
  js.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  // Node maintenance scripts (.mjs/.cjs): the main TS/React block below only
  // covers *.{js,jsx,ts,tsx}, so ESM/CJS scripts need Node globals here.
  {
    files: ['**/*.{mjs,cjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
  // Prettier integration and custom rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@next/next': nextPlugin,
      react,
      'react-hooks': reactHooks,
      'import-x': importX,
      'unused-imports': unusedImports,
      'prefer-arrow-functions': preferArrowFunctions,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        React: 'readonly',
        NodeJS: 'readonly',
        JSX: 'readonly',
        FormDataEntryValue: 'readonly',
        CanvasTextAlign: 'readonly',
        CanvasTextBaseline: 'readonly',
        FileSystemEntry: 'readonly',
        FileSystemFileEntry: 'readonly',
        FileSystemDirectoryEntry: 'readonly',
        FileSystemDirectoryReader: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import-x/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // typescript-eslint recommended preset; project-specific overrides below win.
      ...tsEslintRecommendedRules,

      // Next.js rules (previously from next/core-web-vitals)
      '@next/next/no-html-link-for-pages': 'error',
      '@next/next/no-img-element': 'warn',
      '@next/next/no-head-import-in-document': 'error',
      '@next/next/no-sync-scripts': 'error',
      '@next/next/no-script-component-in-head': 'error',

      'no-unused-vars': 'off', // Disable the core ESLint rule
      'unused-imports/no-unused-imports': 'error', // Report unused imports
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      // Add any custom rules here
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      // Enforce CLAUDE.md conventions: no non-null assertions, no unexplained ts-comments.
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/no-empty-interface': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',

      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript
      // react/jsx-uses-react and react/jsx-uses-vars removed: ESLint 10 tracks JSX
      // references natively, so both rules are redundant.
      'react/self-closing-comp': 'error',
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-no-target-blank': 'error',
      'react/no-array-index-key': 'warn',

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      //  Disable the refs rule - false positive with react-hook-form's handleSubmit pattern
      // when callbacks are properly memoized with useCallback
      'react-hooks/refs': 'off',

      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['hrefLeft', 'hrefRight'],
          aspects: ['invalidHref', 'preferButton'],
        },
      ],
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/heading-has-content': ['error', { components: ['Heading'] }],

      // Import rules and sorting
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin', // Node.js built-in modules
            'external', // npm packages
            'internal', // Internal modules
            ['parent', 'sibling'], // Parent and sibling imports
            'index', // Index imports
            'object',
            'type', // Type imports
          ],
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'next/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['react', 'next'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/no-unresolved': 'off', // TypeScript handles this
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-anonymous-default-export': 'warn',

      // General best practices
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-unneeded-ternary': 'error',

      // Project convention: prefer arrow functions over `function` declarations and
      // named function expressions. The plugin only reports/auto-fixes cases where the
      // conversion preserves behaviour — it skips generators, functions that use `this`,
      // `arguments`, or `new.target`, and `export default function` declarations.
      // `returnStyle: 'unchanged'` keeps the rule scoped to function-vs-arrow only; it
      // does not police the return-body style of existing arrow functions.
      // Object methods stay as shorthand (`allowObjectProperties`) to avoid `this` churn.
      'prefer-arrow-functions/prefer-arrow-functions': [
        'error',
        {
          allowNamedFunctions: false,
          allowObjectProperties: true,
          classPropertiesAllowed: false,
          returnStyle: 'unchanged',
        },
      ],
      // ── Baseline: applies to ALL TS/TSX functions ──
      // Max 75 lines per function everywhere by default. 75 (not 50) was chosen by
      // measuring the codebase: it flags genuine outliers while keeping the bulk of
      // already-cohesive functions compliant. Tests, scripts, and content-template
      // modules are scoped out below; component files get a 250 allowance.
      'max-lines-per-function': [
        'error',
        { max: 75, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],

      // Cyclomatic complexity ceiling
      complexity: ['error', { max: 10 }],

      // Cap parameter count
      'max-params': ['error', { max: 4 }],

      // Optional: limit nesting depth directly (catches "several nested ifs")
      'max-depth': ['error', { max: 3 }],
      // ── Override: React component files get 250-line allowance ──
    },
  },
  {
    files: ['**/components/**/*.tsx', '**/app/**/*.tsx', '**/*.component.tsx'],
    rules: {
      'max-lines-per-function': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
    },
  },
  // Tests, e2e, and one-off maintenance scripts are exempt from the function-length
  // limit: describe/it/setup blocks and CLI scripts are legitimately long, so the rule
  // would add noise rather than signal there.
  {
    files: [
      '**/*.spec.{ts,tsx}',
      'e2e/**',
      'scripts/**/*.{ts,tsx}',
      '**/test-utils/**',
      'tests/**',
    ],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
  // Next.js App Router special files conventionally use named (often default-exported)
  // function declarations — keep them as-is and exempt them from the arrow-function rule.
  {
    files: [
      '**/page.tsx',
      '**/layout.tsx',
      '**/loading.tsx',
      '**/error.tsx',
      '**/global-error.tsx',
      '**/not-found.tsx',
      '**/template.tsx',
      '**/default.tsx',
      '**/route.ts',
      '**/middleware.ts',
      '**/instrumentation.ts',
      '**/manifest.ts',
      '**/sitemap.ts',
      '**/robots.ts',
      '**/opengraph-image.tsx',
      '**/icon.tsx',
      '**/apple-icon.tsx',
    ],
    rules: {
      'prefer-arrow-functions/prefer-arrow-functions': 'off',
    },
  },
  // Vitest testing configuration
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx', 'tests/**', '**/test-utils/**'],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/max-nested-describe': ['error', { max: 5 }],
      // Disable rules that require typed linting
      'vitest/valid-title': 'off',
      // Relax strict rules that flag legitimate test patterns
      'vitest/no-conditional-expect': 'warn',
      'vitest/expect-expect': 'warn',
      // Test files render raw <a> elements to assert component class behavior, not
      // to navigate — the no-html-link-for-pages rule is inapplicable here.
      '@next/next/no-html-link-for-pages': 'off',
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
  },
  // Security linting (full recommended rule set, applied everywhere).
  security.configs.recommended,
  {
    // `detect-object-injection` flags every computed member access, including
    // the ones TypeScript already proves safe — a `Record<Union, T>` read with
    // a key of that same union type. Every occurrence in this codebase is that
    // pattern, so the rule is pure noise here and, under `--max-warnings=0`,
    // would break the build on correct code. Genuinely dynamic lookups keyed by
    // untrusted strings use a `Map` instead (see `normalizeLanguage`), which is
    // safe by construction rather than by lint.
    rules: { 'security/detect-object-injection': 'off' },
  },
  {
    // Tests are not an attack surface: they build file paths from `mkdtemp`
    // fixtures and regexes from their own fixture data. The plugin's threat
    // model (untrusted runtime input reaching `fs`/`RegExp`) does not apply.
    files: ['**/*.spec.{js,jsx,ts,tsx}', '**/*.int.spec.{js,jsx,ts,tsx}'],
    rules: {
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
    },
  },
  eslintPluginPrettierRecommended,
  ...pluginQuery.configs['flat/recommended'],
  {
    files: ['src/app/**/*.{js,jsx,cjs,mjs,ts,tsx}'],
    plugins: {
      'better-tailwindcss': betterTailwind,
    },
    settings: {
      'better-tailwindcss': {
        // Tailwind v4 is CSS-first: point at the stylesheet that `@import`s tailwindcss
        // so the plugin can resolve the full set of valid utility classes.
        entryPoint: 'src/app/(site)/globals.css',
      },
    },
    rules: {
      // Validation only. Class *ordering/formatting* is owned by
      // prettier-plugin-tailwindcss (prettier.config.mjs), so better-tailwindcss's
      // stylistic rules (enforce-consistent-class-order, line-wrapping, etc.) are
      // intentionally omitted to avoid fighting Prettier.
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-duplicate-classes': 'error',
      'better-tailwindcss/no-deprecated-classes': 'error',
      // Catches invalid/typo'd utilities that compile to nothing. `ignore` is a
      // list of anchored regexes for genuine non-Tailwind classes the resolver
      // can't know about: video.js skin classes (`vjs-*`) and its player-container
      // hook, sonner's wrapper, the banner animation marker (keyframes live in
      // globals.css), and the bio figure markers (`bio-figure`, its float
      // modifiers, and the caption classes) that mirror the sanitizer's figure
      // contract for stable selectors (parsed by bio-figure-extension.ts and
      // rendered by the NodeView). Test placeholder classNames are handled by
      // the spec override below. See
      // docs/auto-generated/BETTER_TAILWINDCSS_FINDINGS.md.
      'better-tailwindcss/no-unknown-classes': [
        'error',
        {
          ignore: [
            '^vjs-',
            '^audio-player-wrapper$',
            '^toaster$',
            '^banner-strip-slide$',
            '^bio-figure(--(left|right|center)|-(caption|title|subtitle|attribution))?$',
          ],
        },
      ],
    },
  },
  {
    // Specs pass placeholder classNames (`custom-class`, `class1`, …) to assert
    // className plumbing; those aren't real utilities, so don't flag them.
    files: ['**/*.spec.{js,jsx,ts,tsx}'],
    rules: {
      'better-tailwindcss/no-unknown-classes': 'off',
    },
  },
  {
    // Payload regenerates these files at will ("DO NOT MODIFY" banner), so
    // their import order cannot be hand-maintained.
    files: ['src/app/(payload)/**'],
    rules: {
      'import-x/order': 'off',
    },
  },
];

export default eslintConfig;
