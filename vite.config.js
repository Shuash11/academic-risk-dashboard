import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Keep models/*.onnx served as static assets (public dir) and also allow root models for dev parity.
// GitHub Pages: repo is Shuash11/academic-risk-dashboard — base must be "/academic-risk-dashboard/" for Pages project site.
// For local dev, base "/" is fine. We use relative base "./" so build works both locally and on Pages without 404s for assets.
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'public',
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
