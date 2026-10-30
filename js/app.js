import { router } from './router.js';
import { renderNavigation, updateActiveNavigation } from './shared/navigation.js';
import { auth } from './shared/auth.js';
import { events } from './shared/events.js';
import { seed } from './shared/seed.js';
import { storage } from './shared/storage.js';
import { ui } from './shared/ui.js';
import { validation, validators } from './shared/validation.js';
import { registerClubRoutes } from './clubs/clubRoutes.js';
import { registerProjectRoutes } from './projects/projectRoutes.js';
import { registerLearningRoutes } from './learning/learningRoutes.js';
import { registerProfileRoutes } from './profile/profileRoutes.js';
import { registerCommunityRoutes } from './community/communityRoutes.js';

const appContent = document.querySelector('#app-content');
const navContainer = document.querySelector('#main-nav');
const resetButton = document.querySelector('#reset-demo-data');

const navItems = [
  { label: 'Clubs', path: '/clubs', glyph: 'C', description: 'Temporary Clubs & Interest Groups' },
  { label: 'Projects', path: '/projects', glyph: 'P', description: 'Project & Contributor Collaboration' },
  { label: 'Learning', path: '/learning', glyph: 'L', description: 'Learning & Mentorship Exchange' },
  { label: 'Community', path: '/community', glyph: 'M', description: 'Campus Community & Information Sharing' },
  { label: 'Profile', path: '/profile', glyph: 'U', description: 'Shared student identity' },
];

function renderPrimaryNavigation() {
  if (!navContainer) return;
  renderNavigation(navContainer, navItems, ui.createElement);
  updateActiveNavigation(navContainer, router.currentPath());
}

function syncActiveNavigation() {
  if (!navContainer) return;
  updateActiveNavigation(navContainer, router.currentPath());
}

function syncAuthHeaderState() {
  const authButton = document.querySelector('#auth-action');
  const selector = document.querySelector('#demo-user-select');
  const currentUser = auth.getCurrentUser();

  if (authButton) {
    authButton.textContent = currentUser ? 'Sign out' : 'Sign in';
    authButton.setAttribute('aria-label', currentUser ? 'Sign out' : 'Sign in');
  }

  if (selector) {
    const students = auth.getStudents();
    selector.replaceChildren();
    if (!students.length) {
      selector.disabled = true;
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No accounts';
      selector.append(option);
      return;
    }

    students.forEach((student) => {
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = `${student.displayName} · ${student.branch}`;
      selector.append(option);
    });

    selector.value = currentUser ? currentUser.id : '';
    selector.disabled = !auth.isAuthenticated();
  }
}

function renderLoginPage() {
  const page = ui.createElement('div', { className: 'page-stack' });
  const card = ui.createElement('section', { className: 'card auth-card' });
  const heading = ui.createElement('div', { className: 'page-heading-copy' });
  heading.append(ui.createElement('div', { className: 'eyebrow', text: 'AUTHENTICATED ACCESS' }));
  heading.append(ui.createElement('h1', { text: 'Sign in to Campus Collaboration Hub' }));
  heading.append(ui.createElement('p', { text: 'Use your student account to manage clubs, projects, learning, and community activity.' }));
  card.append(heading);

  const form = document.createElement('form');
  form.className = 'auth-form';

  const emailField = ui.createElement('label', { className: 'form-group', text: 'Campus email' });
  const emailInput = ui.createElement('input', {
    attrs: {
      type: 'email',
      name: 'email',
      placeholder: 'arjun.sharma@campus.example',
      autocomplete: 'email',
      required: true,
    },
  });
  emailField.append(emailInput);

  const passwordField = ui.createElement('label', { className: 'form-group', text: 'Password' });
  const passwordInput = ui.createElement('input', {
    attrs: {
      type: 'password',
      name: 'password',
      placeholder: 'Enter your password',
      autocomplete: 'current-password',
      required: true,
    },
  });
  passwordField.append(passwordInput);

  const submitButton = ui.createButton({ text: 'Sign in', variant: 'primary', type: 'submit' });
  const demoHint = ui.createElement('p', { className: 'form-hint', text: 'Demo seed accounts use the password Campus2026!.' });
  const errorText = ui.createElement('p', { className: 'auth-error', attrs: { role: 'alert' } });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    const result = await auth.login({ email, password });
    errorText.textContent = result.message || '';
    if (!result.ok) {
      errorText.style.display = 'block';
      return;
    }
    ui.showToast(result.message, 'success');
    router.navigate('/clubs');
  });

  form.append(emailField, passwordField, submitButton, demoHint, errorText);
  card.append(form);
  page.append(card);
  appContent.replaceChildren(page);
  syncActiveNavigation();
}

function renderProfile() {
  const user = auth.getCurrentUser();
  const page = ui.createElement('div', { className: 'page-stack' });
  const heading = ui.createElement('section', { className: 'page-heading' });
  const copy = ui.createElement('div', { className: 'page-heading-copy' });
  copy.append(ui.createElement('div', { className: 'eyebrow', text: 'SHARED STUDENT IDENTITY' }));
  copy.append(ui.createElement('h1', { text: 'Your profile' }));
  copy.append(ui.createElement('p', { text: 'The same authenticated student identity is referenced by Clubs, Projects, Learning and Community.' }));
  heading.append(copy);
  heading.append(ui.createButton({ text: 'Edit profile', variant: 'primary', onClick: () => router.navigate('/profile/edit') }));
  page.append(heading);

  if (!user) {
    ui.showEmpty(page, 'Sign in to view your authenticated student profile.');
    appContent.replaceChildren(page);
    return;
  }

  const profile = ui.createElement('section', { className: 'card profile-card' });
  const initials = user.displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  profile.append(ui.createElement('div', { className: 'profile-avatar', text: initials, attrs: { 'aria-hidden': 'true' } }));
  const details = ui.createElement('div', { className: 'profile-details' });
  details.append(ui.createElement('h2', { text: user.displayName }));
  details.append(ui.createElement('div', { className: 'profile-meta', text: `Year ${user.year} · ${user.branch} · IIIT Dharwad` }));
  details.append(ui.createElement('p', { text: user.bio }));
  details.append(ui.createElement('strong', { text: 'Skills I can contribute' }));
  const knownTags = ui.createElement('div', { className: 'tag-list' });
  (user.skillsKnown || []).forEach((skill) => knownTags.append(ui.createElement('span', { className: 'tag', text: skill })));
  details.append(knownTags);
  details.append(ui.createElement('strong', { text: 'Skills I am learning', attrs: { style: 'display:block;margin-top:1rem' } }));
  const learningTags = ui.createElement('div', { className: 'tag-list' });
  (user.skillsLearning || []).forEach((skill) => learningTags.append(ui.createElement('span', { className: 'tag', text: skill })));
  details.append(learningTags);
  profile.append(details);
  page.append(profile);

  const note = ui.createElement('section', { className: 'notice' });
  note.append(ui.createElement('span', { className: 'notice-mark', text: 'i' }));
  const noteCopy = ui.createElement('div');
  noteCopy.append(ui.createElement('strong', { text: 'Authenticated student session' }));
  noteCopy.append(ui.createElement('p', { text: 'Your active session is stored for this browser and remains scoped to the signed-in student account.' }));
  note.append(noteCopy);
  page.append(note);

  appContent.replaceChildren(page);
  syncActiveNavigation();
}

function renderFatalError(error) {
  const panel = ui.createElement('section', { className: 'empty-state' });
  panel.append(ui.createElement('h1', { text: 'The workspace could not start' }));
  panel.append(ui.createElement('p', { text: error?.message || 'An unexpected initialisation error occurred.' }));
  panel.append(ui.createElement('p', { text: 'Check that the folder is being served over HTTP by VS Code Live Server and that browser storage is enabled.' }));
  appContent.replaceChildren(panel);
}

function attachGlobalHandlers() {
  document.querySelector('#auth-action')?.addEventListener('click', () => {
    if (auth.isAuthenticated()) {
      auth.logout();
      ui.showToast('You have been signed out.', 'success');
      router.navigate('/login');
      return;
    }
    router.navigate('/login');
  });

  document.querySelector('#demo-user-select')?.addEventListener('change', (event) => {
    const selectedStudentId = event.target.value;
    if (!selectedStudentId) return;
    const switched = auth.switchUser(selectedStudentId);
    if (switched) ui.showToast(`Signed in as ${auth.getCurrentUser().displayName}.`, 'success');
  });

  resetButton?.addEventListener('click', () => {
    const confirmed = window.confirm('Reset all Campus Collaboration Hub demo data to its original state? This removes changes saved by this prototype in this browser.');
    if (!confirmed) return;
    try {
      storage.resetDemoData();
      auth.logout();
      auth.initialise();
      router.navigate('/login');
      ui.showToast('Demo data has been restored.', 'success');
    } catch (error) {
      ui.showToast(error.message || 'Could not reset demo data.', 'error');
    }
  });
}

async function initialiseApplication() {
  try {
    seed.initialise();
    await auth.initialise();
    renderPrimaryNavigation();

    registerClubRoutes();
    registerProjectRoutes();
    registerLearningRoutes();
    registerProfileRoutes();
    registerCommunityRoutes();
    router.register('/login', renderLoginPage);
    router.register('/profile', renderProfile);

    window.addEventListener('cch:navigated', () => {
      syncAuthHeaderState();
      syncActiveNavigation();
      if (!auth.isAuthenticated() && router.currentPath() !== '/login') {
        router.navigate('/login');
      }
    });

    router.start();
    attachGlobalHandlers();
    syncAuthHeaderState();

    auth.onUserChange(() => {
      syncAuthHeaderState();
      router.dispatch();
    });

    events.on('demoDataReset', () => {
      auth.initialise();
    });

    globalThis.CCH = Object.freeze({ storage, auth, validation, validators, events, router });
    console.info('Campus Collaboration Hub foundation ready. Use CCH in DevTools for smoke tests.');

    if (!auth.isAuthenticated()) {
      router.navigate('/login');
    }
  } catch (error) {
    console.error('Campus Collaboration Hub failed to initialise:', error);
    renderFatalError(error);
  }
}

initialiseApplication();
