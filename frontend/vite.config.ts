// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    proxy: {
        '/clone': 'http://127.0.0.1:8000',
        '/init': 'http://127.0.0.1:8000', // <--- ADD THIS
        '/files': 'http://127.0.0.1:8000',
        '/read': 'http://127.0.0.1:8000',
        '/write': 'http://127.0.0.1:8000',
        '/delete': 'http://127.0.0.1:8000',
        '/rename': 'http://127.0.0.1:8000',
        '/push': 'http://127.0.0.1:8000',
        '/terminal': 'http://127.0.0.1:8000',
        '/health': 'http://127.0.0.1:8000',
    },
  },
});