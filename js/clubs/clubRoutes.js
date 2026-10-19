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

export function registerClubRoutes() {
  router.register('/clubs', () => renderPendingFeature('Temporary Clubs'));
  router.register('/clubs/new', () => renderPendingFeature('Club creation'));
  router.register('/clubs/:id', () => renderPendingFeature('Club details'));
}
