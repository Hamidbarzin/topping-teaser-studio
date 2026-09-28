import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { exportToDownloadsPlugin } from './vite.exportPlugin.ts'

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/topping-teaser-studio/" : "/",
  plugins: [react(), tailwindcss(), exportToDownloadsPlugin()],
  server: {
    host: "127.0.0.1",
    port: 8765,
    strictPort: true,
  },
})
