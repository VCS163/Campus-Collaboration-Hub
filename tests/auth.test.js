import test from 'node:test';
import assert from 'node:assert/strict';
import { auth } from '../js/shared/auth.js';
import { seed } from '../js/shared/seed.js';

function createStorageMock() {
  const store = new Map();
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); },
    key(index) { return Array.from(store.keys())[index] ?? null; },
    get length() { return store.size; },
  };
}

test('user can sign in with a seeded student account', async () => {
  globalThis.localStorage = createStorageMock();
  seed.initialise();
  auth.initialise();

  const result = await auth.login({ email: 'arjun.sharma@campus.example', password: 'Campus2026!' });

  assert.equal(result.ok, true);
  assert.equal(auth.getCurrentUserId(), 'student_arjun_sharma');
  assert.equal(auth.isAuthenticated(), true);
});

test('wrong password is rejected and leaves the user signed out', async () => {
  globalThis.localStorage = createStorageMock();
  seed.initialise();
  auth.initialise();

  const result = await auth.login({ email: 'priya.nair@campus.example', password: 'wrong-password' });

  assert.equal(result.ok, false);
  assert.equal(auth.isAuthenticated(), false);
  assert.equal(auth.getCurrentUser(), null);
});

test('logout clears the active authenticated session', async () => {
  globalThis.localStorage = createStorageMock();
  seed.initialise();
  auth.initialise();
  await auth.login({ email: 'ravi.kumar@campus.example', password: 'Campus2026!' });

  auth.logout();

  assert.equal(auth.isAuthenticated(), false);
  assert.equal(auth.getCurrentUserId(), null);
});
