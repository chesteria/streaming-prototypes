import { defineConfig } from 'vite';

export default defineConfig({
  base: '/UTA/v2/',
  build: {
    target: 'es2017',
    sourcemap: !!process.env.VITE_SOURCEMAP,
  },
  server: {
    port: 3000,
  },
});
