import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // On some Windows setups, `localhost` may resolve to IPv4 or IPv6.
    // Binding to `::` makes the dev server reachable via both `localhost` and `127.0.0.1`.
    host: '::',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
