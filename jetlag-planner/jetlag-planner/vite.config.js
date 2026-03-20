import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import yamlPlugin from './vite-plugin-yaml.js'

export default defineConfig({
  plugins: [
    yamlPlugin(),
    react(),
  ],
})
