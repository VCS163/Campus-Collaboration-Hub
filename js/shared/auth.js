import { events } from './events.js';
import { storage } from './storage.js';

const CURRENT_USER_KEY = 'cch_currentUserId';

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

function renderSwitcher() {
  const select = document.querySelector('#demo-user-select');
  if (!select) return;

  const currentUserId = getCurrentUserId();
  const students = getStudents();
  select.replaceChildren();

  for (const student of students) {
    const option = document.createElement('option');
    option.value = student.id;
    option.textContent = `${student.displayName} · ${student.branch}`;
    select.append(option);
  }

  select.value = currentUserId || students[0]?.id || '';
  select.disabled = students.length === 0;
}

function initialise() {
  const students = getStudents();
  if (students.length === 0) {
    renderSwitcher();
    return null;
  }

  const savedUserId = getCurrentUserId();
  const userExists = students.some((student) => student.id === savedUserId);
  const selectedUserId = userExists ? savedUserId : students[0].id;

  try {
    globalThis.localStorage.setItem(CURRENT_USER_KEY, selectedUserId);
  } catch (error) {
    console.error('Could not persist the selected demo user:', error);
  }

  renderSwitcher();
  return getCurrentUser();
}

function switchUser(studentId) {
  const student = storage.getById('students', studentId);
  if (!student) return false;

  try {
    globalThis.localStorage.setItem(CURRENT_USER_KEY, studentId);
  } catch (error) {
    console.error('Could not switch demo user:', error);
    return false;
  }

  renderSwitcher();
  events.emit('userChanged', { userId: studentId, user: student });
  return true;
}

function onUserChange(callback) {
  return events.on('userChanged', callback);
}

export const auth = Object.freeze({
  initialise,
  getCurrentUser,
  getCurrentUserId,
  switchUser,
  onUserChange,
  renderSwitcher,
});
