import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { listDocumentsHandler } from '../../packages/@echo-ai/api-core/src/index';
import { list as lambdaList } from '../../services/api/src/lambda/documents';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
loadEnv({ path: resolve(__dirname, '../../.env.local') });

function assert(cond: any, msg: string) { if (!cond) throw new Error('Assertion failed: ' + msg); }
function log(t: string) { console.log('✓', t); }

async function testInvalidQuery() {
  const token = process.env.TEST_TOKEN;
  if (!token) {
    console.warn('Set TEST_TOKEN in .env.local to run this test. Skipping.');
    return;
  }
  const headers = { authorization: 'Bearer ' + token } as any;
  const req = { method: 'GET', path: '/api/documents', headers, query: { limit: 'not-a-number' } } as any;
  const res = await listDocumentsHandler(req);
  assert(res.status === 400, 'shared handler should 400 on invalid limit');
  log('shared handler invalid query');

  const event: any = { requestContext: { http: { method: 'GET' } }, rawPath: '/documents', headers, queryStringParameters: { limit: 'not-a-number' } };
  const lambdaRes = await lambdaList(event);
  assert(lambdaRes.statusCode === 400, 'lambda adapter should 400 on invalid limit');
  log('lambda adapter invalid query');
}

(async () => {
  try {
    await testInvalidQuery();
    console.log('\nContracts: documents.list completed');
  } catch (e) {
    console.error('Contracts failed:', e);
    process.exit(1);
  }
})();

