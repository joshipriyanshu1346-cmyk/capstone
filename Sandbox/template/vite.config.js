import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    strictPort: true,
    // Disable HMR since we're in a container - the browser won't be able to connect back
    hmr: false,
    // Ensure the server responds to all network interfaces
    middlewareMode: false,
  }
});

