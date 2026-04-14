import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2017',
    sourcemap: !!process.env.VITE_SOURCEMAP,
  },
  server: {
    port: 3000,
  },
});
