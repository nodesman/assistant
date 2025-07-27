import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        },
        external: [
          'sqlite3',
          'better-sqlite3',
          'tedious',
          'mysql',
          'mysql2',
          'oracledb',
          'pg',
          'pg-query-stream',
        ],
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    plugins: [vue()],
    optimizeDeps: {
      include: [
        '@milkdown/core',
        '@milkdown/vue',
        '@milkdown/preset-commonmark',
        '@milkdown/theme-nord',
      ],
    },
  }
})
