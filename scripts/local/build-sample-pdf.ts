import { writeFileSync, readFileSync } from 'fs';
import path from 'path';
const fontkit = require('next/dist/compiled/@next/font/dist/fontkit');

async function build() {
  const fontPath = path.join(__dirname, '..', 'node_modules', '.pnpm', 'next@15.4.1_react-dom@19.1.0_react@19.1.0__react@19.1.0', 'node_modules', 'next', 'dist', 'compiled', '@vercel', 'og', 'noto-sans-v27-latin-regular.ttf');
  const fontBuffer = readFileSync(fontPath);
  const font = fontkit.default(fontBuffer);
  const text = 'Hello, world!';
  const subset = font.createSubset();
  const map = new Map<number, number>();
  const widths: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const glyph = font.glyphForCodePoint(cp);
    const cid = subset.includeGlyph(glyph);
    map.set(cp, cid);
    widths[cid] = glyph.advanceWidth;
  }
  const subsetFont = Buffer.from(subset.encode());
  const cmapEntries = Array.from(map.entries())
    .map(([cp, cid]) => `<${cid.toString(16).padStart(4, '0')}> <${cp
      .toString(16)
      .padStart(4, '0')}>`)
    .join('\n');
  const toUnicode = [
    '/CIDInit /ProcSet findresource begin',
    '12 dict begin',
    'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /Adobe-Identity-UCS def',
    '/CMapType 2 def',
    '1 begincodespacerange',
    '<0000><FFFF>',
    'endcodespacerange',
    `${map.size} beginbfchar`,
    cmapEntries,
    'endbfchar',
    'endcmap',
    'CMapName currentdict /CMap defineresource pop',
    'end',
    'end'
  ].join('\n');

  const hexText = Array.from(text)
    .map(ch => map.get(ch.codePointAt(0)!)!.toString(16).padStart(4, '0'))
    .join('');
  const content = `BT /F1 24 Tf 72 720 Td <${hexText}> Tj ET`;

  const widthsArray = widths.map(w => w || 0).join(' ');
  const objects: Buffer[] = [];
  function addObject(content: Buffer | string) {
    const idx = objects.length + 1;
    const body = Buffer.isBuffer(content) ? content : Buffer.from(content, 'binary');
    const obj = Buffer.concat([
      Buffer.from(`${idx} 0 obj\n`),
      body,
      Buffer.from('\nendobj\n')
    ]);
    objects.push(obj);
  }

  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObject(
    '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /MediaBox [0 0 612 792] /Contents 4 0 R >>'
  );
  addObject(
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  );
  addObject(
    '<< /Type /Font /Subtype /Type0 /BaseFont /F1+NS /Encoding /Identity-H /DescendantFonts [6 0 R] /ToUnicode 7 0 R >>'
  );
  addObject(
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /F1+NS /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 8 0 R /W [0 [${widthsArray}]] >>`
  );
  addObject(`<< /Length ${toUnicode.length} >>\nstream\n${toUnicode}\nendstream`);
  addObject(
    `<< /Type /FontDescriptor /FontName /F1+NS /Flags 32 /FontBBox [0 0 0 0] /Ascent 0 /Descent 0 /CapHeight 0 /ItalicAngle 0 /StemV 0 /FontFile2 9 0 R >>`
  );
  addObject(
    Buffer.concat([
      Buffer.from(`<< /Length ${subsetFont.length} >>\nstream\n`),
      subsetFont,
      Buffer.from('\nendstream')
    ])
  );

  const header = '%PDF-1.7\n';
  let pos = header.length;
  const xrefEntries = ['0000000000 65535 f\r\n'];
  const bodyBuffers: Buffer[] = [];
  for (const obj of objects) {
    xrefEntries.push(pos.toString().padStart(10, '0') + ' 00000 n\r\n');
    pos += obj.length;
    bodyBuffers.push(obj);
  }
  const body = Buffer.concat(bodyBuffers);
  const xref = Buffer.from(`xref\n0 ${objects.length + 1}\n` + xrefEntries.join(''), 'ascii');
  const trailer = Buffer.from(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${pos}\n%%EOF`,
    'ascii'
  );
  const pdf = Buffer.concat([Buffer.from(header, 'ascii'), body, xref, trailer]);
  writeFileSync(path.join(__dirname, 'sample.pdf'), pdf);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
