import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    handler: 'src/handler.ts',
    'local-runner': 'src/local-runner.ts',
  },
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  skipNodeModulesBundle: false,
  shims: false,
  outDir: 'dist',
  outExtension: () => ({ js: '.cjs' }),
});
