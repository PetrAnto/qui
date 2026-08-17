// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.open-next/**',
      '**/.wrangler/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '.pnpm-store/**',
      'packages/db/migrations/**',
      'scripts/geo/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // The safety rules live in one place; nothing else may re-derive them.
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator='==='] > MemberExpression[property.name='ageBand']",
          message:
            'Age comparisons belong in @indenoi/core policy, not in the app. See AGENTS.md.',
        },
      ],
    },
  },
);
