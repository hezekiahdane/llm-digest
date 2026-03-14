import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
    'playwright-report/**',
    'src/types/database.ts',
  ]),
  {
    rules: {
      // Disallow console.log in production code; allow warn/error
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Enforce explicit types (no implicit any)
      '@typescript-eslint/no-explicit-any': 'error',

      // Catch unused variables early; allow _ prefix for intentional ignores
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Prevent dangerouslySetInnerHTML (XSS risk)
      'react/no-danger': 'error',

      // Enforce <Image> from next/image over raw <img> tags
      '@next/next/no-img-element': 'error',

      // Prefer const over let for non-reassigned variables
      'prefer-const': 'error',

      // Disallow variable declarations from shadowing outer scope
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
    },
  },
]);

export default eslintConfig;
