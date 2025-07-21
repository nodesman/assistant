import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
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
  preload: {},
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