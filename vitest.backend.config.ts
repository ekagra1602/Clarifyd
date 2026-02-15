import { defineConfig } from 'vitest/config';
import viteTsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [viteTsConfigPaths()],
  test: {
    environment: 'node',
    include: ['convex/backend.test.ts'],
    // setupFiles: [], // Explicitly empty to avoid picking up src/test/setup.ts if inherited
  },
});
