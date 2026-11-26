import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

// SWC emits decorator metadata, which Nest's DI-by-type and @nestjs/graphql need.
export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
    exclude: ['src/generated/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**',
        'src/**/*.spec.ts',
        'src/main.ts',
        'src/setup-token.ts',
        'src/schema.generate.ts',
      ],
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
})
