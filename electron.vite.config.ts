import { resolve } from 'path'
import { defineConfig, externalizeDeps } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import dotenv from 'dotenv'

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
