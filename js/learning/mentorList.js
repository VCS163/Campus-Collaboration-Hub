import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { storage } from '../shared/storage.js';
import { ui } from '../shared/ui.js';
import { learningService } from './learningService.js';

function statusVariant(status) {
  if (status === 'open' || status === 'active' || status === 'accepted') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'closed' || status === 'completed') return 'neutral';
  return 'danger';
}

function makeSectionHeading(title, description, action = null) {
  const heading = ui.createElement('div', { className: 'section-heading learning-section-heading' });
  const copy = ui.createElement('div');
  copy.append(ui.createElement('h2', { text: title }));
  copy.append(ui.createElement('p', { text: description }));
  heading.append(copy);
  if (action) heading.append(action);
  return heading;
}

function makeMetric(label, value, note) {
  const card = ui.createElement('article', { className: 'card metric-card learning-metric' });
  const copy = ui.createElement('div');
  copy.append(ui.createElement('span', { className: 'metric-label', text: label }));
  copy.append(ui.createElement('strong', { className: 'metric-value', text: String(value) }));
  copy.append(ui.createElement('span', { className: 'metric-note', text: note }));
  card.append(copy);
  return card;
}

function renderOfferCard(offer) {
  const mentor = storage.getById('students', offer.mentorId);
  const accepted = learningService.getOfferAcceptedCount(offer.id);
  const card = ui.createElement('article', { className: 'card learning-offer-card' });
  const body = ui.createElement('div', { className: 'learning-card-body' });
  const top = ui.createElement('div', { className: 'learning-card-topline' });
  top.append(ui.createBadge(offer.status, statusVariant(offer.status)));
  top.append(ui.createElement('span', { className: 'learning-capacity', text: `${accepted} / ${offer.maxLearners} learner places filled` }));
  body.append(top);
  body.append(ui.createElement('h3', { text: offer.topics.join(' · ') }));
  body.append(ui.createElement('p', { className: 'learning-card-description', text: offer.description }));
  const tags = ui.createElement('div', { className: 'tag-list' });
  offer.topics.forEach((topic) => tags.append(ui.createElement('span', { className: 'tag', text: topic })));
  body.append(tags);
  const meta = ui.createElement('div', { className: 'learning-card-meta' });
  meta.append(ui.createElement('span', { text: `Mentor · ${mentor?.displayName || 'Unknown student'}` }));
  if (offer.availability) meta.append(ui.createElement('span', { text: `Availability · ${offer.availability}` }));
  body.append(meta);
  card.append(body);
  const actions = ui.createElement('div', { className: 'card-actions learning-card-actions' });
  actions.append(ui.createButton({ text: 'View offer', variant: 'secondary', onClick: () => router.navigate(`/learning/offers/${encodeURIComponent(offer.id)}`) }));
  card.append(actions);
  return card;
}

function renderLearningRequestCard(request, currentUserId) {
  const requester = storage.getById('students', request.requesterId);
  const isOwner = request.requesterId === currentUserId;
  const card = ui.createElement('article', { className: 'card learning-request-card' });
  const body = ui.createElement('div', { className: 'learning-card-body' });
  const top = ui.createElement('div', { className: 'learning-card-topline' });
  top.append(ui.createBadge(request.status, statusVariant(request.status)));
  if (request.mode) top.append(ui.createBadge(request.mode.replaceAll('-', ' '), 'primary'));
  body.append(top);
  body.append(ui.createElement('h3', { text: request.topic }));
  body.append(ui.createElement('p', { className: 'learning-card-description', text: request.goal }));
  body.append(ui.createElement('span', { className: 'learning-card-meta', text: `Requested by ${requester?.displayName || 'Unknown student'} · Year ${requester?.year ?? '—'} ${requester?.branch || ''}` }));
  card.append(body);
  if (isOwner && request.status === 'open') {
    const actions = ui.createElement('div', { className: 'card-actions learning-card-actions' });
    actions.append(ui.createButton({
      text: 'Close request', variant: 'quiet',
      onClick: () => {
        const confirmed = window.confirm('Close this learning request? It will remain visible as closed but will no longer be an active request.');
        if (!confirmed) return;
        const result = learningService.closeLearningRequest(request.id, currentUserId);
        if (result.ok) {
          ui.showToast('Learning request closed.', 'success');
          router.dispatch();
        } else ui.showToast(`Could not close request (${result.reason}).`, 'error');
      },
    }));
    card.append(actions);
  }
  return card;
}

function renderMyMentorshipRequest(request) {
  const offer = storage.getById('mentorOffers', request.offerId);
  const mentor = storage.getById('students', request.mentorId);
  const card = ui.createElement('article', { className: 'learning-activity-row' });
  const copy = ui.createElement('div', { className: 'learning-activity-copy' });
  copy.append(ui.createElement('strong', { text: offer?.topics.join(' · ') || 'Mentor offer' }));
  copy.append(ui.createElement('span', { text: `To ${mentor?.displayName || 'Unknown mentor'}` }));
  card.append(copy);
  card.append(ui.createBadge(request.status, statusVariant(request.status)));
  if (request.status === 'accepted') {
    const group = learningService.getGroupForRequest(request);
    if (group) card.append(ui.createButton({ text: 'Open group', variant: 'secondary', className: 'btn-small', onClick: () => router.navigate(`/learning/groups/${encodeURIComponent(group.id)}`) }));
  }
  return card;
}

export function renderMentorList() {
  const currentUserId = auth.getCurrentUserId();
  const page = ui.createElement('div', { className: 'page-stack learning-page' });
  const heading = ui.createElement('section', { className: 'page-heading learning-page-heading' });
  const copy = ui.createElement('div', { className: 'page-heading-copy' });
  copy.append(ui.createElement('div', { className: 'eyebrow', text: 'PILLAR 03 · LEARNING & MENTORSHIP' }));
  copy.append(ui.createElement('h1', { text: 'Learn together. Share what you know.' }));
  copy.append(ui.createElement('p', { text: 'Find a peer mentor, offer guidance in a subject you know, or make your learning goal visible to students who can help.' }));
  heading.append(copy);
  const headingActions = ui.createElement('div', { className: 'learning-heading-actions' });
  headingActions.append(ui.createButton({ text: 'Create learning request', variant: 'secondary', onClick: () => router.navigate('/learning/requests/new') }));
  headingActions.append(ui.createButton({ text: 'Offer mentorship', variant: 'primary', onClick: () => router.navigate('/learning/offers/new') }));
  heading.append(headingActions);
  page.append(heading);

  const offers = storage.get('mentorOffers').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const learningRequests = storage.get('learningRequests').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ownSentRequests = storage.query('mentorshipRequests', (request) => request.learnerId === currentUserId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const ownOfferIds = new Set(storage.query('mentorOffers', (offer) => offer.mentorId === currentUserId).map((offer) => offer.id));
  const incomingRequests = storage.query('mentorshipRequests', (request) => ownOfferIds.has(request.offerId) && request.status === 'pending');
  const ownGroups = storage.query('learningGroups', (group) => group.mentorId === currentUserId || group.learnerIds.includes(currentUserId));
  const activeGroups = ownGroups.filter((group) => group.status === 'active').length;

  const metrics = ui.createElement('section', { className: 'metric-grid learning-metrics', attrs: { 'aria-label': 'Learning summary' } });
  metrics.append(makeMetric('Open mentor offers', offers.filter((offer) => offer.status === 'open').length, 'Students sharing what they can teach'));
  metrics.append(makeMetric('Open learning requests', learningRequests.filter((request) => request.status === 'open').length, 'Students looking for support'));
  metrics.append(makeMetric('Requests to review', incomingRequests.length, 'Pending on your mentor offers'));
  metrics.append(makeMetric('Your active groups', activeGroups, 'Mentor-led learning groups'));
  page.append(metrics);

  const searchWrap = ui.createElement('div', { className: 'learning-search-bar' });
  const searchLabel = ui.createElement('label', { text: 'Search learning topics', attrs: { for: 'learning-search' } });
  const search = ui.createElement('input', { id: 'learning-search', attrs: { type: 'search', placeholder: 'Search Python, embedded C, design…', autocomplete: 'off' } });
  searchWrap.append(searchLabel, search);
  page.append(searchWrap);

  const offerSection = ui.createElement('section', { className: 'page-stack learning-section' });
  offerSection.append(makeSectionHeading('Mentor directory', 'Browse explicit offers. A skill on someone’s profile does not automatically mean they are offering mentorship.'));
  const offerGrid = ui.createElement('div', { className: 'learning-card-grid', id: 'learning-offer-results' });
  const filteredOffers = () => offers.filter((offer) => offer.topics.join(' ').toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()) || offer.description.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));
  const renderOffers = () => ui.renderList(offerGrid, filteredOffers(), renderOfferCard, 'No mentor offers match this search. Try another topic or publish an offer.');
  renderOffers();
  search.addEventListener('input', renderOffers);
  offerSection.append(offerGrid);
  page.append(offerSection);

  const requestSection = ui.createElement('section', { className: 'page-stack learning-section' });
  requestSection.append(makeSectionHeading('Students looking to learn', 'Open learning requests are visible independently from mentor offers. Students may receive peer support even without a formal mentor.'));
  const requestGrid = ui.createElement('div', { className: 'learning-card-grid learning-request-grid' });
  const filteredRequests = () => learningRequests.filter((request) => `${request.topic} ${request.goal}`.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));
  const renderRequests = () => ui.renderList(requestGrid, filteredRequests(), (request) => renderLearningRequestCard(request, currentUserId), 'No learning requests match this search yet.');
  renderRequests();
  search.addEventListener('input', renderRequests);
  requestSection.append(requestGrid);
  page.append(requestSection);

  const activityGrid = ui.createElement('div', { className: 'learning-bottom-grid' });
  const sentSection = ui.createElement('section', { className: 'card learning-activity-panel' });
  sentSection.append(ui.createElement('h2', { text: 'Your mentorship requests' }));
  sentSection.append(ui.createElement('p', { className: 'section-description', text: 'Track requests you have sent to mentors.' }));
  const sentList = ui.createElement('div', { className: 'learning-activity-list' });
  if (!ownSentRequests.length) ui.showEmpty(sentList, 'You have not requested mentorship yet. Open a mentor offer to get started.');
  else ownSentRequests.forEach((request) => sentList.append(renderMyMentorshipRequest(request)));
  sentSection.append(sentList);
  activityGrid.append(sentSection);

  const incomingSection = ui.createElement('section', { className: 'card learning-activity-panel' });
  incomingSection.append(ui.createElement('h2', { text: 'Requests for your offers' }));
  incomingSection.append(ui.createElement('p', { className: 'section-description', text: 'Review requests sent to the mentor offers you created.' }));
  const incomingList = ui.createElement('div', { className: 'learning-activity-list' });
  if (!incomingRequests.length) ui.showEmpty(incomingList, 'No pending mentorship requests for your offers.');
  else incomingRequests.forEach((request) => {
    const offer = storage.getById('mentorOffers', request.offerId);
    const learner = storage.getById('students', request.learnerId);
    const row = ui.createElement('article', { className: 'learning-activity-row' });
    const copyBlock = ui.createElement('div', { className: 'learning-activity-copy' });
    copyBlock.append(ui.createElement('strong', { text: learner?.displayName || 'Unknown learner' }));
    copyBlock.append(ui.createElement('span', { text: offer?.topics.join(' · ') || 'Mentor offer' }));
    row.append(copyBlock);
    row.append(ui.createBadge('pending', 'warning'));
    row.append(ui.createButton({ text: 'Review', variant: 'secondary', className: 'btn-small', onClick: () => router.navigate(`/learning/offers/${encodeURIComponent(request.offerId)}`) }));
    incomingList.append(row);
  });
  incomingSection.append(incomingList);
  activityGrid.append(incomingSection);
  page.append(activityGrid);

  const groupsSection = ui.createElement('section', { className: 'page-stack learning-section' });
  groupsSection.append(makeSectionHeading('Your learning groups', 'Accepted mentorship requests create or connect to a learning group with a shared objective.'));
  const groupGrid = ui.createElement('div', { className: 'learning-card-grid' });
  const sortedGroups = ownGroups.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!sortedGroups.length) ui.showEmpty(groupGrid, 'Your learning groups will appear here after a mentor accepts a request.');
  else sortedGroups.forEach((group) => {
    const mentor = storage.getById('students', group.mentorId);
    const learnerCount = group.learnerIds.length;
    const card = ui.createElement('article', { className: 'card learning-group-card' });
    const body = ui.createElement('div', { className: 'learning-card-body' });
    const top = ui.createElement('div', { className: 'learning-card-topline' });
    top.append(ui.createBadge(group.status, statusVariant(group.status)));
    top.append(ui.createElement('span', { className: 'learning-capacity', text: `${learnerCount} ${learnerCount === 1 ? 'learner' : 'learners'}` }));
    body.append(top);
    body.append(ui.createElement('h3', { text: group.topic }));
    body.append(ui.createElement('p', { className: 'learning-card-meta', text: `Mentor · ${mentor?.displayName || 'Unknown student'}` }));
    card.append(body);
    card.append(ui.createElement('div', { className: 'card-actions', children: [ui.createButton({ text: 'Open learning group', variant: 'secondary', onClick: () => router.navigate(`/learning/groups/${encodeURIComponent(group.id)}`) })] }));
    groupGrid.append(card);
  });
  groupsSection.append(groupGrid);
  page.append(groupsSection);

  document.querySelector('#app-content').replaceChildren(page);
}
