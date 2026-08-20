import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import jsxA11Y from 'eslint-plugin-jsx-a11y';
import _import from 'eslint-plugin-import';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  ...fixupConfigRules(
    compat.extends(
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking', // ✅ Type-aware linting
      'plugin:jsx-a11y/recommended',
      'plugin:import/typescript',
      'prettier'
    )
  ),
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'expo-env.d.ts',
      'dist/',
      'build/',
      'coverage/',
      'commitlint.config.js',
      'eslint.config.js',
      'jest.config.js',
      'tsconfig.json',
      'config/webpack.common.js',
      'config/webpack.dev.js',
      'commitlint-jira-rule.js',
      'config/webpack.prod.js',
      'tailwind.config.js',
    ],
  },
  {
    // Applies everywhere: eslint-plugin-react warns on every file it lints if
    // it cannot work out which React version to target.
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // Type-aware linting only covers the app's own TypeScript, the files
    // tsconfig.json actually includes.
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['supabase/functions/**'],

    plugins: {
      react: fixupPluginRules(react),
      'react-hooks': fixupPluginRules(reactHooks),
      '@typescript-eslint': fixupPluginRules(typescriptEslint),
      'jsx-a11y': fixupPluginRules(jsxA11Y),
      import: fixupPluginRules(_import),
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },

      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',

      parserOptions: {
        project: './tsconfig.json', // ✅ Enables type-aware linting
        tsconfigRootDir: __dirname,
        excludeFiles: ['commitlint.config.js', 'eslint.config.js'],
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    settings: {
      react: {
        version: 'detect',
      },

      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },

    rules: {
      // ✅ TypeScript Best Practices
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/prefer-promise-reject-errors': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',

      // ✅ React Best Practices
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',

      // ✅ Code Quality
      'no-console': [
        'error',
        {
          allow: ['warn', 'error'],
        },
      ],

      // ✅ Import Sorting & Rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-unresolved': 'error',
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            '**/*.test.ts',
            '**/*.test.tsx',
            '**/jest.setup.js',
          ],
        },
      ],

      // ✅ React Hooks Best Practices
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // ✅ Accessibility Rules
      // React Native, not the DOM: `autoFocus` on a TextInput is the standard
      // way to open a screen with the keyboard up, and carries none of the
      // focus-stealing problems the browser rule is written for.
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/anchor-is-valid': 'error',
    },
  },

  // Plain JavaScript tooling files (babel.config.js, eslint.config.mjs,
  // scripts/) are outside tsconfig.json, so they are parsed without type
  // information and the type-aware rules have to be switched off for them.
  ...fixupConfigRules(
    compat.extends('plugin:@typescript-eslint/disable-type-checked')
  ).map((config) => ({
    ...config,
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
  })),
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],

    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 'latest',
    },

    rules: {
      // Node tooling scripts legitimately use CommonJS and print to stdout.
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },
  {
    // Expo/Babel config files are CommonJS, unlike the ESM lint config.
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },

  // Supabase edge functions are Deno, not React Native: they are excluded from
  // the app's tsconfig, import their dependencies from URLs, and run against
  // Deno's globals. Lint them without type information and without the
  // Node/bundler module resolution the rest of the app uses.
  ...fixupConfigRules(
    compat.extends('plugin:@typescript-eslint/disable-type-checked')
  ).map((config) => ({
    ...config,
    files: ['supabase/functions/**/*.ts'],
  })),
  {
    files: ['supabase/functions/**/*.ts'],

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        Deno: 'readonly',
      },
    },

    rules: {
      // Deno resolves `https://` imports at run time; the Node resolver cannot.
      'import/no-unresolved': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
];
