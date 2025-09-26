import type { PdfParse } from '@/types/document';

export async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (typeof (body as { on?: unknown }).on === 'function') {
    // Node.js Readable
    const nodeBody = body as {
      on(event: 'data', handler: (chunk: Buffer) => void): void;
      on(event: 'end', handler: () => void): void;
      on(event: 'error', handler: (err: unknown) => void): void;
    };
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      nodeBody.on('data', (chunk: Buffer) => chunks.push(chunk));
      nodeBody.on('end', () => resolve(Buffer.concat(chunks)));
      nodeBody.on('error', reject);
    });
  }
  if (typeof (body as { getReader?: unknown }).getReader === 'function') {
    // Web ReadableStream
    const reader = (body as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((u) => Buffer.from(u)));
  }
  if (typeof (body as { text?: unknown }).text === 'function') {
    const txt = await (body as { text: () => Promise<string> }).text();
    return Buffer.from(txt, 'utf-8');
  }
  if (Buffer.isBuffer(body)) return body as Buffer;
  return Buffer.from(String(body), 'utf-8');
}

export async function extractTextFromBuffer(buf: Buffer, contentType?: string): Promise<string | null> {
  const type = (contentType || '').toLowerCase();
  if (!type || type.startsWith('text/') || type.includes('markdown')) {
    return buf.toString('utf-8');
  }
  if (type === 'application/pdf' || type.includes('pdf')) {
    // Temporarily filter noisy pdf.js glyph mapping warnings
    const originalLog = console.log;
    console.log = (first: unknown, ...rest: unknown[]) => {
      if (typeof first === 'string' && first.includes('Ran out of space in font private use area')) {
        return;
      }
      originalLog(first, ...rest);
    };

    try {
      // Import from internal implementation to avoid index.js debug self-test reading ./test/data
      const pdfParseMod = await import('pdf-parse/lib/pdf-parse.js');
      const pdfParse = (pdfParseMod.default as unknown) as PdfParse;
      // Optionally load a custom pdf.js build (e.g. extended PUA) by setting PDFJS_PUA_VERSION
      const version = process.env.PDFJS_PUA_VERSION;
      const data = await pdfParse(buf, version ? { version } : undefined);
      const text: string = data?.text || '';
      return text || null;
    } finally {
      console.log = originalLog;
    }
  }
  return null;
}
