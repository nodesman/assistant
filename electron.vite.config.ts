import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {},
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