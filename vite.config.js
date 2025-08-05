import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/GABRIELAI190911/', // <--- ESTA LINHA É A CHAVE!
})