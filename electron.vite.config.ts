import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import dotenv from 'dotenv'
import { externalizeDeps } from 'vite-plugin-externalize-deps'

// Load .env file
dotenv.config()

export default defineConfig({
  main: {
    plugins: [externalizeDeps()],
    define: {
      // This makes the environment variables available under the import.meta.env object
      'import.meta.env.GOOGLE_CLIENT_ID': `"${process.env.GOOGLE_CLIENT_ID}"`,
      'import.meta.env.GOOGLE_CLIENT_SECRET': `"${process.env.GOOGLE_CLIENT_SECRET}"`,
    },
    build: {
      rollupOptions: {
        external: ['sqlite3', 'better-sqlite3', 'pg', 'mysql', 'oracledb'],
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDeps()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src')
      }
    },
    plugins: [vue()]
  }
})
