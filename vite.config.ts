import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base 設為相對路徑，方便部署到 GitHub Pages 子路徑
export default defineConfig({
  base: './',
  plugins: [react()],
})
