import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEPLOYMENT_PREVIEW': JSON.stringify(String(process.env.VERCEL_ENV === 'preview')),
  },
})
