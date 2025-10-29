import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createPresign } from '../../services/api/src/lambda/presign';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
loadEnv({ path: resolve(__dirname, '../../.env.local') });

function assert(cond: any, msg: string) { if (!cond) throw new Error('Assertion failed: ' + msg); }
function log(t: string) { console.log('✓', t); }

async function testMissingFields() {
  const token = process.env.TEST_TOKEN;
  if (!token) {
    console.warn('Set TEST_TOKEN in .env.local to run this test. Skipping.');
    return;
  }
  const headers: any = { authorization: 'Bearer ' + token };
  const res = await createPresign({
    requestContext: { http: { method: 'POST' } },
    rawPath: '/documents/presign',
    headers,
    body: JSON.stringify({}),
  } as any);
  assert(res.statusCode === 400, 'missing fields should 400');
  log('presign missing fields');
}

(async () => {
  try {
    await testMissingFields();
    console.log('\nContracts: presign completed');
  } catch (e) {
    console.error('Contracts failed:', e);
    process.exit(1);
  }
})();

