import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { storage } from '../shared/storage.js';
import { ui } from '../shared/ui.js';
import { OPPORTUNITY_STATUSES, PROJECT_CATEGORIES, projectService } from './projectService.js';

const STATUS_LABELS = Object.freeze({
  open: 'Open for applications',
  active: 'Active project',
  completed: 'Completed',
  archived: 'Archived',
});

function createMetric(label, value, note) {
  const card = ui.createElement('article', { className: 'card metric-card project-metric' });
  const copy = ui.createElement('div');
  copy.append(ui.createElement('span', { className: 'metric-label', text: label }));
  copy.append(ui.createElement('strong', { className: 'metric-value', text: String(value) }));
  copy.append(ui.createElement('span', { className: 'metric-note', text: note }));
  card.append(copy);
  return card;
}

function statusVariant(status) {
  if (status === 'open' || status === 'active') return 'success';
  if (status === 'completed') return 'warning';
  return 'neutral';
}

function createOpportunityCard(opportunity, currentUserId) {
  const owner = storage.getById('students', opportunity.ownerId);
  const roles = projectService.getOpportunityRoles(opportunity.id);
  const applications = projectService.getOpportunityApplications(opportunity.id);
  const acceptedCount = applications.filter((application) => application.status === 'accepted').length;
  const isOwner = opportunity.ownerId === currentUserId;

  const card = ui.createElement('article', { className: `card project-card project-card-${opportunity.status}` });
  const top = ui.createElement('div', { className: 'project-card-top' });
  top.append(ui.createBadge(opportunity.category, 'primary'));
  top.append(ui.createBadge(STATUS_LABELS[opportunity.status] || opportunity.status, statusVariant(opportunity.status)));
  if (opportunity.beginnerFriendly) top.append(ui.createBadge('Beginner friendly', 'success'));
  card.append(top);

  card.append(ui.createElement('h2', { className: 'project-card-title', text: opportunity.title }));
  card.append(ui.createElement('p', { className: 'project-card-description', text: opportunity.description }));

  const meta = ui.createElement('div', { className: 'project-card-meta' });
  meta.append(ui.createElement('span', { text: `${roles.length} ${roles.length === 1 ? 'role' : 'roles'}` }));
  meta.append(ui.createElement('span', { text: `${acceptedCount} accepted ${acceptedCount === 1 ? 'contributor' : 'contributors'}` }));
  card.append(meta);

  const roleTags = ui.createElement('div', { className: 'tag-list project-role-tags' });
  roles.slice(0, 3).forEach((role) => roleTags.append(ui.createBadge(role.roleTitle, 'neutral')));
  if (roles.length > 3) roleTags.append(ui.createBadge(`+${roles.length - 3} more`, 'neutral'));
  if (roles.length) card.append(roleTags);

  const ownerLine = ui.createElement('p', { className: 'project-owner-line' });
  ownerLine.append(document.createTextNode('Posted by '));
  ownerLine.append(ui.createElement('strong', { text: owner?.displayName || 'Unknown student' }));
  if (isOwner) ownerLine.append(ui.createBadge('Your opportunity', 'primary'));
  card.append(ownerLine);

  const actions = ui.createElement('div', { className: 'project-card-actions' });
  actions.append(ui.createButton({
    text: opportunity.status === 'archived' ? 'View archive' : 'View opportunity',
    variant: 'secondary',
    onClick: () => router.navigate(`/projects/${encodeURIComponent(opportunity.id)}`),
  }));
  card.append(actions);
  return card;
}

export function renderProjectList({ search = '', category = 'All categories', status = 'all' } = {}) {
  const allOpportunities = storage.get('opportunities').sort((left, right) =>
    String(right.createdAt || '').localeCompare(String(left.createdAt || '')),
  );
  const activeCount = allOpportunities.filter((item) => ['open', 'active'].includes(item.status)).length;
  const acceptedCount = storage.get('applications').filter((item) => item.status === 'accepted').length;
  const currentUserId = auth.getCurrentUserId();
  const trimmedSearch = search.trim().toLocaleLowerCase();

  const visible = allOpportunities.filter((opportunity) => {
    const matchesOpportunity = [opportunity.title, opportunity.description, opportunity.category]
      .some((value) => String(value || '').toLocaleLowerCase().includes(trimmedSearch));
    const matchesRole = projectService.getOpportunityRoles(opportunity.id).some((role) =>
      [role.roleTitle, role.description, role.skills]
        .some((value) => String(value || '').toLocaleLowerCase().includes(trimmedSearch)),
    );
    const matchesSearch = !trimmedSearch || matchesOpportunity || matchesRole;
    const matchesCategory = category === 'All categories' || opportunity.category === category;
    const matchesStatus = status === 'all' || opportunity.status === status;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const page = ui.createElement('div', { className: 'page-stack projects-page' });
  const heading = ui.createElement('section', { className: 'page-heading projects-page-heading' });
  const headingCopy = ui.createElement('div', { className: 'page-heading-copy' });
  headingCopy.append(ui.createElement('div', {
    className: 'eyebrow',
    children: [ui.createElement('span', { className: 'eyebrow-dot' }), 'PILLAR 02 · BUILD TOGETHER'],
  }));
  headingCopy.append(ui.createElement('h1', { text: 'Find a project worth building.' }));
  headingCopy.append(ui.createElement('p', {
    text: 'Discover student-led projects, find a contributor role that fits your skills, and apply to build something together. Beginners are welcome when an opportunity says so.',
  }));
  heading.append(headingCopy);
  heading.append(ui.createButton({
    text: '+ Post an opportunity',
    variant: 'primary',
    onClick: () => router.navigate('/projects/new'),
  }));
  page.append(heading);

  const metrics = ui.createElement('section', { className: 'metric-grid project-metrics', attrs: { 'aria-label': 'Project statistics' } });
  metrics.append(createMetric('All opportunities', allOpportunities.length, 'Across the demo campus'));
  metrics.append(createMetric('Recruiting now', activeCount, 'Open or active projects'));
  metrics.append(createMetric('Accepted contributors', acceptedCount, 'Students already on teams'));
  page.append(metrics);

  const filterBar = ui.createElement('section', { className: 'project-filter-bar', attrs: { 'aria-label': 'Search and filter opportunities' } });
  const searchGroup = ui.createElement('div', { className: 'project-search-group' });
  searchGroup.append(ui.createElement('label', { text: 'Search opportunities', attrs: { for: 'project-search', class: 'visually-hidden' } }));
  const searchInput = ui.createElement('input', {
    id: 'project-search',
    attrs: { type: 'search', placeholder: 'Search by project, skill or topic…', value: search },
  });
  searchGroup.append(searchInput);
  filterBar.append(searchGroup);

  const categorySelect = ui.createElement('select', { attrs: { id: 'project-category-filter', 'aria-label': 'Filter by category' } });
  categorySelect.append(ui.createElement('option', { text: 'All categories', attrs: { value: 'All categories' } }));
  PROJECT_CATEGORIES.forEach((item) => categorySelect.append(ui.createElement('option', { text: item, attrs: { value: item } })));
  categorySelect.value = category;
  filterBar.append(categorySelect);

  const statusSelect = ui.createElement('select', { attrs: { id: 'project-status-filter', 'aria-label': 'Filter by status' } });
  statusSelect.append(ui.createElement('option', { text: 'All statuses', attrs: { value: 'all' } }));
  OPPORTUNITY_STATUSES.forEach((item) => statusSelect.append(ui.createElement('option', { text: STATUS_LABELS[item], attrs: { value: item } })));
  statusSelect.value = status;
  filterBar.append(statusSelect);

  const applyFilters = () => renderProjectList({ search: searchInput.value, category: categorySelect.value, status: statusSelect.value });
  categorySelect.addEventListener('change', applyFilters);
  statusSelect.addEventListener('change', applyFilters);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') applyFilters();
  });
  searchInput.addEventListener('input', () => {
    if (searchInput.value === '') applyFilters();
  });
  const searchButton = ui.createButton({ text: 'Search', variant: 'secondary', onClick: applyFilters });
  filterBar.append(searchButton);
  page.append(filterBar);

  const listHeader = ui.createElement('div', { className: 'project-list-heading' });
  listHeader.append(ui.createElement('h2', { text: 'Opportunities' }));
  listHeader.append(ui.createElement('span', { className: 'project-result-count', text: `${visible.length} found` }));
  page.append(listHeader);

  const grid = ui.createElement('section', { className: 'project-grid', attrs: { 'aria-label': 'Opportunity directory' } });
  if (visible.length === 0) {
    const empty = ui.createElement('div', { className: 'project-empty-state' });
    empty.append(ui.createElement('div', { className: 'project-empty-icon', text: '↗', attrs: { 'aria-hidden': 'true' } }));
    empty.append(ui.createElement('h2', { text: allOpportunities.length ? 'No matching opportunities' : 'Start the first project' }));
    empty.append(ui.createElement('p', { text: allOpportunities.length ? 'Try changing your search or filters.' : 'Post an opportunity and invite students with the skills and curiosity to contribute.' }));
    if (!allOpportunities.length) empty.append(ui.createButton({ text: 'Post an opportunity', variant: 'primary', onClick: () => router.navigate('/projects/new') }));
    grid.append(empty);
  } else {
    visible.forEach((opportunity) => grid.append(createOpportunityCard(opportunity, currentUserId)));
  }
  page.append(grid);

  page.append(ui.createElement('p', {
    className: 'foundation-footer-note project-principle',
    text: 'Projects are organised around a defined outcome. A student joins by applying to a specific contributor role; the opportunity owner reviews each application.',
  }));

  document.querySelector('#app-content').replaceChildren(page);
}
