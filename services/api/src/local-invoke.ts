// Minimal local invoker for ad-hoc testing of handlers.
import { Auth, Documents } from './index';

type ArgMap = Record<string, string>;

function parseArgs(argv: string[]): ArgMap {
  const out: ArgMap = {};
  for (const a of argv) {
    if (!a.startsWith('--')) continue;
    const idx = a.indexOf('=');
    if (idx === -1) out[a.slice(2)] = 'true';
    else out[a.slice(2, idx)] = a.slice(idx + 1);
  }
  return out;
}

function bearerHeaders(token?: string) {
  const t = token || process.env.TOKEN || '';
  return t ? { authorization: `Bearer ${t}` } : {};
}

async function main() {
  const action = process.argv[2] || 'help';
  const args = parseArgs(process.argv.slice(3));

  if (action === 'help') {
    console.log(`Usage:
  pnpm --filter @echo-ai/service-api run local <action> [--key=VAL]

Actions:
  signup --email=... --password=... [--name=...]
  login --email=... --password=...
  me --token=...
  documents:create --token=... --key=... --filename=... [--filetype=...] [--filesize=...] [--documentId=...]
  documents:list --token=... [--limit=20] [--cursor=...]
  documents:get --token=... --id=...
  documents:delete --token=... --id=...
  documents:summarize --token=... --id=...
`);
    return;
  }

  // Auth
  if (action === 'signup') {
    const { email, password, name } = args;
    const res = await (Auth.signup as any)({
      version: '2.0', routeKey: 'POST /auth/signup', rawPath: '/auth/signup',
      body: JSON.stringify({ email, password, name }), isBase64Encoded: false,
    });
    console.log(res);
    return;
  }
  if (action === 'login') {
    const { email, password } = args;
    const res = await (Auth.login as any)({
      version: '2.0', routeKey: 'POST /auth/login', rawPath: '/auth/login',
      body: JSON.stringify({ email, password }), isBase64Encoded: false,
    });
    console.log(res);
    return;
  }
  if (action === 'me') {
    const headers = bearerHeaders(args.token);
    const res = await (Auth.me as any)({ version: '2.0', routeKey: 'GET /me', rawPath: '/me', headers });
    console.log(res);
    return;
  }

  // Documents
  if (action === 'documents:create') {
    const headers = bearerHeaders(args.token);
    const { key, filename, filetype, filesize, documentId } = args;
    const res = await (Documents.create as any)({
      version: '2.0', routeKey: 'POST /documents', rawPath: '/documents', headers,
      body: JSON.stringify({ key, filename, filetype, filesize: Number(filesize || 0), documentId }),
      isBase64Encoded: false,
    });
    console.log(res);
    return;
  }
  if (action === 'documents:list') {
    const headers = bearerHeaders(args.token);
    const qs = new URLSearchParams();
    if (args.limit) qs.set('limit', String(args.limit));
    if (args.cursor) qs.set('cursor', String(args.cursor));
    const res = await (Documents.list as any)({
      version: '2.0', routeKey: 'GET /documents', rawPath: '/documents', headers,
      rawQueryString: qs.toString(), queryStringParameters: Object.fromEntries(qs.entries()),
    });
    console.log(res);
    return;
  }
  if (action === 'documents:get') {
    const headers = bearerHeaders(args.token);
    const id = args.id;
    const res = await (Documents.get as any)({
      version: '2.0', routeKey: 'GET /documents/{id}', rawPath: `/documents/${id}`, headers,
      pathParameters: { id },
    });
    console.log(res);
    return;
  }
  if (action === 'documents:delete') {
    const headers = bearerHeaders(args.token);
    const id = args.id;
    const res = await (Documents.remove as any)({
      version: '2.0', routeKey: 'DELETE /documents/{id}', rawPath: `/documents/${id}`, headers,
      pathParameters: { id },
    });
    console.log(res);
    return;
  }
  if (action === 'documents:summarize') {
    const headers = bearerHeaders(args.token);
    const id = args.id;
    const res = await (Documents.summarize as any)({
      version: '2.0', routeKey: 'POST /documents/{id}/summarize', rawPath: `/documents/${id}/summarize`, headers,
      pathParameters: { id },
    });
    console.log(res);
    return;
  }

  console.log('Unknown action:', action);
}

main().catch((e) => { console.error(e); process.exit(1); });
