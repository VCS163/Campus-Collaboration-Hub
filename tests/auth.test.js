import test from 'node:test';
import assert from 'node:assert/strict';
import { auth } from '../js/shared/auth.js';
import { seed } from '../js/shared/seed.js';

function createStorageMock() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    get length() {
      return store.size;
    },
  };
}

test('user can sign in with a seeded student account', async () => {
  globalThis.localStorage = createStorageMock();
  seed.initialise();
  auth.initialise();

  const result = await auth.login({
    email: 'arjun.sharma@campus.example',
    password: 'Campus2026!',
  });

  assert.equal(result.ok, true);
  assert.equal(auth.getCurrentUserId(), 'student_arjun_sharma');
  assert.equal(auth.isAuthenticated(), true);
});

test('wrong password is rejected and leaves the user signed out', async () => {
  globalThis.localStorage = createStorageMock();
  seed.initialise();
  auth.initialise();

  const result = await auth.login({
    email: 'priya.nair@campus.example',
    password: 'wrong-password',
  });

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

test('initialisation refuses duplicate student emails and clears any stale session', async () => {
  globalThis.localStorage = createStorageMock();
  seed.initialise();
  await auth.initialise();

  const first = auth.getStudentByEmail('arjun.sharma@campus.example');
  assert.ok(first);

  const duplicate = {
    ...first,
    id: 'student_duplicate_arjun',
    displayName: 'Arjun Duplicate',
    email: 'arjun.sharma@campus.example',
    passwordSalt: 'duplicate-arjun-salt',
    passwordHash: await auth.derivePasswordHash('Campus2026!', 'duplicate-arjun-salt'),
    year: 2,
    branch: 'CSE',
    bio: 'Duplicate account that should never be allowed to start the app.',
    skillsKnown: ['JavaScript'],
    skillsLearning: ['TypeScript'],
    interests: [],
    availabilityHours: 3,
    profileImage: '',
    updatedAt: new Date().toISOString(),
  };

  globalThis.localStorage.setItem('cch_students', JSON.stringify([first, duplicate]));
  globalThis.localStorage.setItem('cch_currentUserId', first.id);

  await auth.initialise();

  assert.equal(auth.getCurrentUserId(), null);
  assert.equal(auth.isAuthenticated(), false);
  assert.equal(auth.getStudentByEmail('arjun.sharma@campus.example'), null);
});

test('switching users is blocked when a duplicate email would make the identity ambiguous', async () => {
  globalThis.localStorage = createStorageMock();
  seed.initialise();
  await auth.initialise();

  const first = auth.getStudentByEmail('arjun.sharma@campus.example');
  assert.ok(first);

  const duplicate = {
    ...first,
    id: 'student_duplicate_arjun',
    displayName: 'Arjun Duplicate',
    email: 'arjun.sharma@campus.example',
    passwordSalt: 'duplicate-arjun-salt',
    passwordHash: await auth.derivePasswordHash('Campus2026!', 'duplicate-arjun-salt'),
    year: 2,
    branch: 'CSE',
    bio: 'Duplicate account that should never become an active session.',
    skillsKnown: ['JavaScript'],
    skillsLearning: ['TypeScript'],
    interests: [],
    availabilityHours: 3,
    profileImage: '',
    updatedAt: new Date().toISOString(),
  };

  globalThis.localStorage.setItem('cch_students', JSON.stringify([first, duplicate]));
  const switched = auth.switchUser(first.id);

  assert.equal(switched, false);
  assert.equal(auth.getCurrentUserId(), null);
});

test('duplicate student emails are rejected to prevent ambiguous account access', async () => {
  globalThis.localStorage = createStorageMock();
  seed.initialise();
  auth.initialise();

  const first = auth.getStudentByEmail('arjun.sharma@campus.example');
  assert.ok(first);

  const duplicate = {
    id: 'student_duplicate_arjun',
    displayName: 'Arjun Duplicate',
    email: 'arjun.sharma@campus.example',
    passwordSalt: 'duplicate-arjun-salt',
    passwordHash: await auth.derivePasswordHash('Campus2026!', 'duplicate-arjun-salt'),
    year: 2,
    branch: 'CSE',
    bio: 'Duplicate account that should never be able to log in.',
    skillsKnown: ['JavaScript'],
    skillsLearning: ['TypeScript'],
    interests: [],
    availabilityHours: 3,
    profileImage: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const studentStore = globalThis.localStorage;
  studentStore.setItem('cch_students', JSON.stringify([first, duplicate]));

  const result = await auth.login({
    email: 'arjun.sharma@campus.example',
    password: 'Campus2026!',
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'duplicate_student_email');
  assert.equal(auth.isAuthenticated(), false);
});

test('switching users rejects invalid or non-existent student IDs', async () => {
  globalThis.localStorage = createStorageMock();
  seed.initialise();
  await auth.initialise();

  const switched = auth.switchUser('non_existent_student_id');
  assert.equal(switched, false);
});
