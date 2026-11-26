// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

/** Shared API import fences (constitution: Code Quality Constraints › Module layout). */
const apiImportFences = [
  {
    // The raw Prisma client is plumbing: features use the injected PrismaService instead.
    files: ['apps/api/src/**/*.ts'],
    ignores: [
      'apps/api/src/prisma/**',
      'apps/api/src/auth/**',
      'apps/api/src/generated/**',
      'apps/api/src/setup-token.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/*', '**/generated/prisma/**', '**/prisma/prisma.client*'],
              message:
                'Inject PrismaService; the raw Prisma client stays in prisma/, auth/ and setup-token.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    // better-auth only in auth/, resolvers, REST controllers and the composition root
    files: ['apps/api/src/**/*.ts'],
    ignores: [
      'apps/api/src/auth/**',
      'apps/api/src/**/*.resolver.ts',
      'apps/api/src/**/*.controller.ts',
      'apps/api/src/generated/**',
      'apps/api/src/app.module.ts',
      'apps/api/src/main.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['better-auth', 'better-auth/*', '@thallesp/nestjs-better-auth'],
              message: 'Auth libraries are only used in auth/, resolvers and controllers.',
            },
          ],
        },
      ],
    },
  },
]

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'apps/api/src/generated/**',
      'apps/web/src/graphql/codegen/**',
      'apps/web/src/routeTree.gen.ts',
      '.specify/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      // Nest DI-by-type needs runtime class imports even when a class only appears in a constructor type.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  ...apiImportFences,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    // components/ui-level shared components must not reach into routes or the data layer
    files: ['apps/web/src/components/**/*.{ts,tsx}', 'apps/web/src/theme/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/routes/**',
                '**/routeTree.gen',
                '**/graphql/**',
                '**/lib/gql-client',
                '**/feature/**',
              ],
              message: 'Shared components stay presentational: no routes, features or data layer.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
)
