import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: '/little-minds-steam-playgroup/',
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [react()],
})
