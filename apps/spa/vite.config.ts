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
});
