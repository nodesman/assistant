import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    // No entry needed here, convention handles it
  },
  preload: {
    // No entry needed here, convention handles it
  },
  renderer: {
    // We need to explicitly tell Vite to use the Vue plugin
    plugins: [vue()]
  }
})
