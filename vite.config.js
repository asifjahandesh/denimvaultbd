import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    fs: {
      allow: [
        '.',
        '..',
        'C:/Users/Asif/.gemini/antigravity/brain'
      ]
    }
  }
})
