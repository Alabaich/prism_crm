import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- Add this import

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- Add this plugin
  ],
  server: {
    host: true, // You probably already have this for Docker
    port: 5176,
    // Add this allowedHosts array:
    allowedHosts: [
      'prismpm.cloud',
      'www.prismpm.cloud',
      'dev.prismpm.cloud'
    ]
  }
})