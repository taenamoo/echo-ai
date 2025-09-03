import { Readable } from 'stream';
import type { PdfParse } from '@/types/document';

export async function streamToBuffer(body: any): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (typeof body.on === 'function') {
    // Node.js Readable
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      body.on('data', (chunk: Buffer) => chunks.push(chunk));
      body.on('end', () => resolve(Buffer.concat(chunks)));
      body.on('error', reject);
    });
  }
  if (typeof body.getReader === 'function') {
    // Web ReadableStream
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((u) => Buffer.from(u)));
  }
  if (typeof body.text === 'function') {
    const txt = await body.text();
    return Buffer.from(txt, 'utf-8');
  }
  if (Buffer.isBuffer(body)) return body;
  return Buffer.from(String(body), 'utf-8');
}

export async function extractTextFromBuffer(buf: Buffer, contentType?: string): Promise<string | null> {
  const type = (contentType || '').toLowerCase();
  if (!type || type.startsWith('text/') || type.includes('markdown')) {
    return buf.toString('utf-8');
  }
  if (type === 'application/pdf' || type.includes('pdf')) {
    const pdfParseMod = await import('pdf-parse');
    const pdfParse = (pdfParseMod.default as unknown) as PdfParse;
    const data = await pdfParse(buf);
    const text: string = data?.text || '';
    return text || null;
  }
  return null;
}
