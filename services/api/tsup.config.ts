import { defineConfig } from 'tsup';

const common = {
  format: ['cjs'] as const,
  target: 'node20',
  platform: 'node' as const,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  skipNodeModulesBundle: false,
  shims: false,
  outExtension: () => ({ js: '.cjs' }),
};

export default defineConfig([
  {
    ...common,
    entry: {
      auth: 'src/lambda/auth.ts',
      documents: 'src/lambda/documents.ts',
      presign: 'src/lambda/presign.ts',
      study: 'src/lambda/study.ts',
    },
    outDir: 'dist/lambda',
  },
  {
    ...common,
    entry: {
      'local-http': 'src/local-http.ts',
      'local-invoke': 'src/local-invoke.ts',
    },
    outDir: 'dist/local',
  },
]);
