/*
 Simple unit tests for:
 - validatePasswordPolicy
 - verifyTokenDetailed
 - requireAuth
 Uses tsx to run; no external test framework.
*/

import { validatePasswordPolicy } from '@/lib/auth/password';
import { generateAccessToken, verifyTokenDetailed } from '@/lib/auth/token';
import { requireAuth, AUTH_ERROR_MESSAGE } from '@/lib/api/auth';
import type { NextRequest } from 'next/server';

function assert(cond: any, msg: string) {
  if (!cond) throw new Error('Assertion failed: ' + msg);
}

function log(title: string) {
  console.log('✓', title);
}

function mockReq(authHeader?: string): NextRequest {
  const headers = new Map<string, string>();
  if (authHeader) headers.set('authorization', authHeader);
  const reqLike = {
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) || headers.get(key) || null,
    },
  } as any;
  return reqLike as unknown as NextRequest;
}

async function testPasswordPolicy() {
  assert(!validatePasswordPolicy('').ok, 'empty password should fail');
  assert(!validatePasswordPolicy('short7').ok, 'short password should fail');
  assert(!validatePasswordPolicy('nospaces 123A').ok, 'whitespace should fail');
  assert(!validatePasswordPolicy('onlyletters').ok, 'only letters should fail');
  assert(!validatePasswordPolicy('12345678').ok, 'only numbers should fail');
  assert(validatePasswordPolicy('abc12345').ok, 'letters+numbers >=8 should pass');
  log('Password policy');
}

async function testVerifyTokenDetailed() {
  const token = generateAccessToken('u1', 'u1@example.com', { expiresIn: '5s' });
  const resValid = verifyTokenDetailed(token);
  assert(resValid.ok === true, 'fresh token should be valid');

  const invalid = verifyTokenDetailed(token + 'x');
  assert(invalid.ok === false && invalid.reason === 'invalid', 'tampered token should be invalid');

  const short = generateAccessToken('u2', 'u2@example.com', { expiresIn: '1s' });
  await new Promise((r) => setTimeout(r, 1200));
  const expired = verifyTokenDetailed(short);
  assert(expired.ok === false && expired.reason === 'expired', 'expired token should be expired');
  log('verifyTokenDetailed');
}

async function testRequireAuth() {
  // Missing
  const r1 = requireAuth(mockReq());
  assert(r1.ok === false, 'missing token should fail');
  const body1 = await (r1 as any).res.json();
  assert(body1.message === AUTH_ERROR_MESSAGE.missing, 'missing message should match');

  // Invalid
  const r2 = requireAuth(mockReq('Bearer not-a-token'));
  assert(r2.ok === false, 'invalid token should fail');
  const body2 = await (r2 as any).res.json();
  assert(body2.message === AUTH_ERROR_MESSAGE.invalid, 'invalid message should match');

  // Valid
  const t = generateAccessToken('me', 'me@example.com', { expiresIn: '5s' });
  const r3 = requireAuth(mockReq('Bearer ' + t));
  assert(r3.ok === true && (r3 as any).userId === 'me', 'valid token should pass and return userId');

  // Expired
  const te = generateAccessToken('you', 'you@example.com', { expiresIn: '1s' });
  await new Promise((r) => setTimeout(r, 1200));
  const r4 = requireAuth(mockReq('Bearer ' + te));
  assert(r4.ok === false, 'expired token should fail');
  const body4 = await (r4 as any).res.json();
  assert(body4.message === AUTH_ERROR_MESSAGE.expired, 'expired message should match');

  log('requireAuth');
}

(async () => {
  try {
    await testPasswordPolicy();
    await testVerifyTokenDetailed();
    await testRequireAuth();
    console.log('\nAll tests passed.');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  }
})();

