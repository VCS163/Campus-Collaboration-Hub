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
  renderNavigation(navContainer, navItems, ui.createElement);
  updateActiveNavigation(navContainer, router.currentPath());
}

function syncActiveNavigation() {
  updateActiveNavigation(navContainer, router.currentPath());
}

function renderProfile() {
  const user = auth.getCurrentUser();
  const page = ui.createElement('div', { className: 'page-stack' });
  const heading = ui.createElement('section', { className: 'page-heading' });
  const copy = ui.createElement('div', { className: 'page-heading-copy' });
  copy.append(ui.createElement('div', { className: 'eyebrow', text: 'SHARED STUDENT IDENTITY' }));
  copy.append(ui.createElement('h1', { text: 'Your profile' }));
  copy.append(ui.createElement('p', { text: 'The same student identity is referenced by Clubs, Projects, Learning and Community.' }));
  heading.append(copy);
  heading.append(ui.createButton({ text: 'Edit profile', variant: 'primary', onClick: () => router.navigate('/profile/edit') }));
  page.append(heading);

  if (!user) {
    ui.showEmpty(page, 'No demo student is available. Reset the demo data to restore the seed profiles.');
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
  noteCopy.append(ui.createElement('strong', { text: 'Demo identity, not authentication' }));
  noteCopy.append(ui.createElement('p', { text: 'Use the demo-user selector in the header to preview the application as another student. This prototype does not create accounts or protect private data.' }));
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
  document.querySelector('#demo-user-select')?.addEventListener('change', (event) => {
    const switched = auth.switchUser(event.target.value);
    if (switched) ui.showToast(`Viewing as ${auth.getCurrentUser().displayName}.`, 'success');
  });

  resetButton?.addEventListener('click', () => {
    const confirmed = window.confirm('Reset all Campus Collaboration Hub demo data to its original state? This removes changes saved by this prototype in this browser.');
    if (!confirmed) return;
    try {
      storage.resetDemoData();
      auth.initialise();
      router.dispatch();
      ui.showToast('Demo data has been restored.', 'success');
    } catch (error) {
      ui.showToast(error.message || 'Could not reset demo data.', 'error');
    }
  });
}

function initialiseApplication() {
  try {
    seed.initialise();
    auth.initialise();
    renderPrimaryNavigation();

    registerClubRoutes();
    registerProjectRoutes();
    registerLearningRoutes();
    registerProfileRoutes();
    registerCommunityRoutes();
    router.register('/profile', renderProfile);

    window.addEventListener('cch:navigated', syncActiveNavigation);
    router.start();
    attachGlobalHandlers();

    auth.onUserChange(() => {
      router.dispatch();
    });

    events.on('demoDataReset', () => {
      auth.initialise();
    });

    // Read-only QA surface for the course prototype; no framework or build tools required.
    globalThis.CCH = Object.freeze({ storage, auth, validation, validators, events, router });
    console.info('Campus Collaboration Hub foundation ready. Use CCH in DevTools for smoke tests.');
  } catch (error) {
    console.error('Campus Collaboration Hub failed to initialise:', error);
    renderFatalError(error);
  }
}

initialiseApplication();
