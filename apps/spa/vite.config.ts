import { defineConfig } from 'vite';

const port = Number(process.env.VITE_DEV_PORT || 5173);

export default defineConfig({
  server: {
    port,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      host: 'localhost',
      port,
    },
  },
  css: {
    // either turn Lightning minification off…
    lightningcss: { minify: false },

    // …or force the classic minifier instead
    // minify: 'esbuild',
  },
});
