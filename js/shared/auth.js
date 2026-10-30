import { events } from './events.js';
import { storage } from './storage.js';

const CURRENT_USER_KEY = 'cch_currentUserId';
const DEFAULT_PASSWORD = 'Campus2026!';
const DEFAULT_PASSWORD_SALT = 'campus-collaboration-hub';

function normaliseEmail(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function getStudents() {
  return storage.get('students');
}

function getCurrentUserId() {
  return storage.getCurrentUserId();
}

function getCurrentUser() {
  const currentUserId = getCurrentUserId();
  return currentUserId ? storage.getById('students', currentUserId) : null;
}

async function derivePasswordHash(password, salt) {
  if (typeof globalThis.crypto?.subtle === 'undefined') {
    throw new Error('The Web Crypto API is required for authenticated student sessions.');
  }

  const encoder = new TextEncoder();
  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(String(password)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  const bits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(String(salt || DEFAULT_PASSWORD_SALT)),
      iterations: 120000,
    },
    material,
    256,
  );

  return Array.from(new Uint8Array(bits))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function buildStudentEmail(student) {
  const name = String(student?.displayName || student?.id || 'student')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, '');
  return `${name || 'student'}@campus.example`;
}

async function ensureStudentCredentials() {
  const students = getStudents();
  if (!students.length) return;

  for (const student of students) {
    const email = normaliseEmail(student.email || buildStudentEmail(student));
    const salt = student.passwordSalt || `${student.id || email}-${DEFAULT_PASSWORD_SALT}`;
    const hash = student.passwordHash || (await derivePasswordHash(DEFAULT_PASSWORD, salt));

    if (student.email !== email || student.passwordSalt !== salt || student.passwordHash !== hash) {
      storage.update('students', student.id, {
        email,
        passwordSalt: salt,
        passwordHash: hash,
      });
    }
  }
}

function setAuthenticatedUser(studentId) {
  const student = storage.getById('students', studentId);
  if (!student) return false;

  try {
    globalThis.localStorage.setItem(CURRENT_USER_KEY, studentId);
  } catch (error) {
    console.error('Could not persist the active student session:', error);
    return false;
  }

  renderSwitcher();
  events.emit('userChanged', { userId: studentId, user: student });
  return true;
}

function renderSwitcher() {
  const select =
    typeof document !== 'undefined' ? document.querySelector('#demo-user-select') : null;
  if (!select) return null;

  const currentUserId = getCurrentUserId();
  const students = getStudents();
  select.replaceChildren();

  if (!students.length) {
    select.disabled = true;
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No students available';
    select.append(option);
    return null;
  }

  for (const student of students) {
    const option = document.createElement('option');
    option.value = student.id;
    option.textContent = `${student.displayName} · ${student.branch}`;
    select.append(option);
  }

  select.value =
    currentUserId && students.some((student) => student.id === currentUserId) ? currentUserId : '';
  select.disabled = !isAuthenticated();
  return select;
}

async function initialise() {
  const students = getStudents();
  if (students.length === 0) {
    renderSwitcher();
    return null;
  }

  await ensureStudentCredentials();

  const savedUserId = getCurrentUserId();
  const userExists = students.some((student) => student.id === savedUserId && student.email);
  if (!userExists && typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.removeItem(CURRENT_USER_KEY);
  }

  renderSwitcher();
  return getCurrentUser();
}

async function login({ email, password }) {
  const trimmedEmail = normaliseEmail(email);
  const trimmedPassword = String(password ?? '').trim();

  if (!trimmedEmail || !trimmedPassword) {
    return {
      ok: false,
      reason: 'missing_credentials',
      message: 'Enter both your campus email and password.',
    };
  }

  const student = getStudents().find((candidate) => {
    const candidateEmail = normaliseEmail(candidate.email || buildStudentEmail(candidate));
    return candidateEmail === trimmedEmail;
  });
  if (!student) {
    return {
      ok: false,
      reason: 'unknown_student',
      message: 'No student account matches that campus email.',
    };
  }

  const salt = student.passwordSalt || `${student.id}-${DEFAULT_PASSWORD_SALT}`;
  const expectedHash = student.passwordHash || (await derivePasswordHash(DEFAULT_PASSWORD, salt));
  const suppliedHash = await derivePasswordHash(trimmedPassword, salt);

  if (suppliedHash !== expectedHash) {
    return {
      ok: false,
      reason: 'invalid_password',
      message: 'Incorrect password for this student account.',
    };
  }

  setAuthenticatedUser(student.id);
  return { ok: true, user: { ...student }, message: `Signed in as ${student.displayName}.` };
}

function logout() {
  if (typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.removeItem(CURRENT_USER_KEY);
  }
  renderSwitcher();
  events.emit('userChanged', { userId: null, user: null });
  return true;
}

function switchUser(studentId) {
  const student = storage.getById('students', studentId);
  if (!student) return false;
  return setAuthenticatedUser(studentId);
}

function isAuthenticated() {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return false;
  return !!storage.getById('students', currentUserId);
}

function onUserChange(callback) {
  return events.on('userChanged', callback);
}

function getStudentByEmail(email) {
  const targetEmail = normaliseEmail(email);
  return (
    getStudents().find(
      (student) => normaliseEmail(student.email || buildStudentEmail(student)) === targetEmail,
    ) ?? null
  );
}

export const auth = Object.freeze({
  initialise,
  login,
  logout,
  getCurrentUser,
  getCurrentUserId,
  getStudents,
  getStudentByEmail,
  switchUser,
  isAuthenticated,
  onUserChange,
  renderSwitcher,
  derivePasswordHash,
});
