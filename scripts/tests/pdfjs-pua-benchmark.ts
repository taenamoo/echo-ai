import { readFile } from 'fs/promises';
import { performance } from 'perf_hooks';
import { createRequire } from 'module';

async function parse(version?: string) {
  const require = createRequire(import.meta.url);
  const mod = await import('pdf-parse/lib/pdf-parse.js');
  const pdfParse = mod.default as (data: Buffer, opts?: { version?: string }) => Promise<{ text?: string }>;
  const pdfPath = require.resolve('pdf-parse/test/data/04-valid.pdf');
  const data = await readFile(pdfPath);
  const start = performance.now();
  await pdfParse(data, version ? { version } : undefined);
  return performance.now() - start;
}

async function main() {
  const defaultTime = await parse();
  const extendedTime = await parse('v2.0.550-pua');
  console.log('Default pdf.js time(ms):', defaultTime.toFixed(2));
  console.log('Extended PUA pdf.js time(ms):', extendedTime.toFixed(2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
