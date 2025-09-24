import { cp, readFile, rm, writeFile } from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

async function build() {
  const require = createRequire(import.meta.url);
  const pdfParseDir = path.dirname(require.resolve('pdf-parse/package.json'));
  const base = path.join(pdfParseDir, 'lib', 'pdf.js');
  const src = path.join(base, 'v2.0.550');
  const dest = path.join(base, 'v2.0.550-pua');
  await rm(dest, { recursive: true, force: true });
  await cp(src, dest, { recursive: true });
  const worker = path.join(dest, 'build', 'pdf.worker.js');
  let content = await readFile(worker, 'utf8');
  content = content.replace(
    'var PRIVATE_USE_OFFSET_END = 0xF8FF;',
    'var PRIVATE_USE_OFFSET_END = 0x10FFFF;'
  );
  await writeFile(worker, content);
  console.log('Extended PUA build written to', dest);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
