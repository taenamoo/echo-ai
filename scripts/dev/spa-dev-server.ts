import http, { IncomingMessage, ServerResponse } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.SPA_PORT || 5173);
const root = process.env.SPA_ROOT || 'apps/spa';

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function send404(res: ServerResponse) {
  res.statusCode = 404;
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.end('Not Found');
}

function serveFile(res: ServerResponse, file: string) {
  try {
    const st = statSync(file);
    const ext = extname(file).toLowerCase();
    res.statusCode = 200;
    res.setHeader('content-type', mime[ext] || 'application/octet-stream');
    res.setHeader('content-length', String(st.size));
    createReadStream(file).pipe(res);
  } catch {
    send404(res);
  }
}

const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = (req.url || '/').split('?')[0];
  const safePath = normalize(url).replace(/^\/+/, '');
  let filePath = join(root, safePath || '');
  if (url === '/' || !extname(filePath)) filePath = join(root, 'index.html');
  if (!existsSync(filePath)) filePath = join(root, 'index.html');
  serveFile(res, filePath);
});

server.listen(port, () => {
  console.log(`[spa-dev] Serving ${root} at http://localhost:${port}`);
  console.log(`Use API at ${process.env.API_BASE || 'http://localhost:8787'}`);
});

