// Minimal local invoker for ad-hoc testing of handlers.
import { Auth } from './index';

async function main() {
  const action = process.argv[2] || 'help';
  if (action === 'help') {
    console.log('Usage: pnpm --filter @echo-ai/service-api run local <signup|login|me>');
    return;
  }
  if (action === 'signup') {
    const res = await (Auth.signup as any)({
      version: '2.0',
      routeKey: 'POST /auth/signup',
      rawPath: '/auth/signup',
      body: JSON.stringify({ email: 'test@example.com', password: 'Test1234', name: 'Tester' }),
      isBase64Encoded: false,
    });
    console.log(res);
    return;
  }
  console.log('Unknown action:', action);
}

main().catch((e) => { console.error(e); process.exit(1); });

