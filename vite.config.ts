import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'

import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

export default defineConfig(({ mode }) => {
  const isTest = mode === 'test'
  const nitroPreset = process.env.NITRO_PRESET || 'vercel'

  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['**/*.test.{ts,tsx}'],
      pool: 'forks',
      teardownTimeout: 1000,
    },
    plugins: isTest
      ? [
          viteTsConfigPaths({
            projects: ['./tsconfig.json'],
          }),
          viteReact(),
        ]
      : [
          devtools(),
          nitro({
            preset: nitroPreset,
          }),
          viteTsConfigPaths({
            projects: ['./tsconfig.json'],
          }),
          tailwindcss(),
          tanstackStart(),
          viteReact(),
        ],
  }
})
