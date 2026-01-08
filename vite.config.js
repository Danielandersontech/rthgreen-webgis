import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        peta: resolve(__dirname, 'peta.html'),
        laporan: resolve(__dirname, 'laporan.html'),
        review: resolve(__dirname, 'review.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  publicDir: 'public',
})