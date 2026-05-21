import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { casProxyPlugin } from './server/cas-middleware.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), casProxyPlugin()],
  server: {
    port: 5173,
  },
})
