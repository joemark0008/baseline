import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

// End-to-end tests (test/*.e2e-spec.ts) boot the real AppModule against DATABASE_URL.
export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // The suites sign up and in many times per minute; test/rate-limit.e2e-spec.ts lowers these itself.
    env: {
      RATE_LIMIT_SIGN_IN_MAX: '1000',
      RATE_LIMIT_LINKS_MAX: '1000',
      RATE_LIMIT_GENERAL_MAX: '100000',
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
})
