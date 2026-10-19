import { router } from '../router.js';

function renderPendingFeature(featureName) {
  const container = document.querySelector('#app-content');
  if (!container) return;

  const section = document.createElement('section');
  section.className = 'empty-state';

  const heading = document.createElement('h1');
  heading.textContent = `${featureName} module is being integrated`;

  const message = document.createElement('p');
  message.textContent = 'This area will become available after the assigned feature branch is reviewed and merged.';

  section.append(heading, message);
  container.replaceChildren(section);
}

export function registerLearningRoutes() {
  router.register('/learning', () => renderPendingFeature('Learning & Mentorship'));
  router.register('/learning/offers/new', () => renderPendingFeature('Mentor offer'));
  router.register('/learning/requests/new', () => renderPendingFeature('Learning request'));
  router.register('/learning/offers/:id/request', () => renderPendingFeature('Mentorship request'));
  router.register('/learning/offers/:id', () => renderPendingFeature('Mentor details'));
  router.register('/learning/groups/:id', () => renderPendingFeature('Learning group'));
}
