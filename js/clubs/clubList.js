import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { storage } from '../shared/storage.js';
import { ui } from '../shared/ui.js';
import { clubService, CLUB_CATEGORIES } from './clubService.js';

function getClubMembers(club) {
  return clubService.getClubMembers(club.id);
}

function createMetric(label, value, detail) {
  const card = ui.createElement('article', { className: 'card metric-card club-metric' });
  const copy = ui.createElement('div');
  copy.append(ui.createElement('span', { className: 'metric-label', text: label }));
  copy.append(ui.createElement('strong', { className: 'metric-value', text: String(value) }));
  copy.append(ui.createElement('span', { className: 'metric-note', text: detail }));
  card.append(copy);
  return card;
}

function createClubCard(club, currentUserId) {
  const members = getClubMembers(club);
  const organiser = storage.getById('students', club.organiserId);
  const archived = club.status === 'archived';
  const card = ui.createElement('article', {
    className: `card club-card${archived ? ' club-card-archived' : ''}`,
  });

  const top = ui.createElement('div', { className: 'club-card-top' });
  top.append(ui.createBadge(club.category, 'primary'));
  top.append(ui.createBadge(archived ? 'Archived' : 'Active', archived ? 'neutral' : 'success'));
  card.append(top);

  const title = ui.createElement('h2', { className: 'club-card-title', text: club.title });
  card.append(title);
  card.append(
    ui.createElement('p', { className: 'club-card-description', text: club.description }),
  );

  const goal = ui.createElement('div', { className: 'club-card-goal' });
  goal.append(ui.createElement('span', { className: 'club-detail-label', text: 'GROUP GOAL' }));
  goal.append(ui.createElement('p', { text: club.goal }));
  card.append(goal);

  const meta = ui.createElement('div', { className: 'club-card-meta' });
  meta.append(ui.createElement('span', { text: `◷ ${club.duration}` }));
  meta.append(
    ui.createElement('span', {
      text: `♙ ${members.length} ${members.length === 1 ? 'member' : 'members'}`,
    }),
  );
  card.append(meta);

  const organiserLine = ui.createElement('p', { className: 'club-organiser-line' });
  organiserLine.append(document.createTextNode('Organised by '));
  organiserLine.append(
    ui.createElement('strong', { text: organiser?.displayName || 'Unknown student' }),
  );
  if (club.organiserId === currentUserId) {
    organiserLine.append(ui.createBadge('Your club', 'primary'));
  }
  card.append(organiserLine);

  const actions = ui.createElement('div', { className: 'club-card-actions' });
  const viewButton = ui.createButton({
    text: archived ? 'View archive' : 'View club',
    variant: 'secondary',
    onClick: () => router.navigate(`/clubs/${encodeURIComponent(club.id)}`),
  });
  actions.append(viewButton);
  card.append(actions);
  return card;
}

export function renderClubList({ category = 'All categories' } = {}) {
  const clubs = storage
    .get('clubs')
    .sort((left, right) =>
      String(right.createdAt || '').localeCompare(String(left.createdAt || '')),
    );
  const activeClubs = clubs.filter((club) => club.status === 'active');
  const archivedClubs = clubs.filter((club) => club.status === 'archived');
  const currentUserId = auth.getCurrentUserId();

  const page = ui.createElement('div', { className: 'page-stack clubs-page' });
  const heading = ui.createElement('section', { className: 'page-heading clubs-page-heading' });
  const headingCopy = ui.createElement('div', { className: 'page-heading-copy' });
  headingCopy.append(
    ui.createElement('div', {
      className: 'eyebrow',
      children: [
        ui.createElement('span', { className: 'eyebrow-dot' }),
        'PILLAR 01 · TEMPORARY COLLABORATION',
      ],
    }),
  );
  headingCopy.append(
    ui.createElement('h1', { text: 'Find your people. Build around an interest.' }),
  );
  headingCopy.append(
    ui.createElement('p', {
      text: 'Start a time-bound group, meet students who share your curiosity, and work towards a purpose together. A club can explore, learn or create — it does not need a software deliverable.',
    }),
  );
  heading.append(headingCopy);
  heading.append(
    ui.createButton({
      text: '+ Create a club',
      variant: 'primary',
      onClick: () => router.navigate('/clubs/new'),
    }),
  );
  page.append(heading);

  const metrics = ui.createElement('section', {
    className: 'metric-grid club-metrics',
    attrs: { 'aria-label': 'Club statistics' },
  });
  metrics.append(createMetric('All groups', clubs.length, 'Across the demo campus'));
  metrics.append(createMetric('Active groups', activeClubs.length, 'Open to new members'));
  metrics.append(
    createMetric('Archived groups', archivedClubs.length, 'Past groups kept read-only'),
  );
  page.append(metrics);

  const filterSection = ui.createElement('section', {
    className: 'club-filter-bar',
    attrs: { 'aria-label': 'Filter clubs' },
  });
  const filterLabel = ui.createElement('label', {
    className: 'club-filter-label',
    text: 'Explore by category',
    attrs: { for: 'club-category-filter' },
  });
  const select = ui.createElement('select', {
    className: 'club-category-filter',
    id: 'club-category-filter',
    attrs: { name: 'category' },
  });
  const allOption = ui.createElement('option', {
    text: 'All categories',
    attrs: { value: 'All categories' },
  });
  select.append(allOption);
  CLUB_CATEGORIES.forEach((item) =>
    select.append(ui.createElement('option', { text: item, attrs: { value: item } })),
  );
  select.value = category;
  select.addEventListener('change', () => renderClubList({ category: select.value }));
  filterSection.append(filterLabel, select);
  page.append(filterSection);

  const visibleClubs =
    category === 'All categories' ? clubs : clubs.filter((club) => club.category === category);
  const list = ui.createElement('section', {
    className: 'club-grid',
    attrs: { 'aria-label': 'Club directory' },
  });

  if (visibleClubs.length === 0) {
    const empty = ui.createElement('div', { className: 'club-empty-state' });
    empty.append(
      ui.createElement('div', {
        className: 'club-empty-icon',
        text: '✦',
        attrs: { 'aria-hidden': 'true' },
      }),
    );
    empty.append(ui.createElement('h2', { text: 'No clubs in this category yet' }));
    empty.append(
      ui.createElement('p', {
        text: 'Start the first group and give other students a reason to join.',
      }),
    );
    empty.append(
      ui.createButton({
        text: 'Create a club',
        variant: 'primary',
        onClick: () => router.navigate('/clubs/new'),
      }),
    );
    list.append(empty);
  } else {
    visibleClubs.forEach((club) => list.append(createClubCard(club, currentUserId)));
  }
  page.append(list);

  const principle = ui.createElement('p', {
    className: 'foundation-footer-note club-principle',
    text: 'Clubs are temporary by design. When the intended period or purpose ends, the organiser can archive the group. Ongoing campus discussion belongs in Community.',
  });
  page.append(principle);
  document.querySelector('#app-content').replaceChildren(page);
}
