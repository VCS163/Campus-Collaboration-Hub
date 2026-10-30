import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { storage } from '../shared/storage.js';
import { ui } from '../shared/ui.js';
import { learningService } from './learningService.js';

function statusVariant(status) {
  if (status === 'accepted' || status === 'open' || status === 'active') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'closed' || status === 'completed') return 'neutral';
  return 'danger';
}

function renderRequestCard(request, offer, currentUserId) {
  const learner = storage.getById('students', request.learnerId);
  const card = ui.createElement('article', { className: 'card learning-review-card' });
  const body = ui.createElement('div', { className: 'learning-card-body' });
  const top = ui.createElement('div', { className: 'learning-card-topline' });
  top.append(ui.createElement('strong', { text: learner?.displayName || 'Unknown learner' }));
  top.append(ui.createBadge(request.status, statusVariant(request.status)));
  body.append(top);
  if (request.message)
    body.append(
      ui.createElement('p', { className: 'learning-card-description', text: request.message }),
    );
  if (learner) {
    const tags = ui.createElement('div', { className: 'tag-list' });
    (learner.skillsKnown || []).forEach((skill) =>
      tags.append(ui.createElement('span', { className: 'tag', text: skill })),
    );
    body.append(tags);
    body.append(
      ui.createElement('p', {
        className: 'learning-card-meta',
        text: `Year ${learner.year} · ${learner.branch} · Learning: ${(learner.skillsLearning || []).join(', ') || 'Not listed'}`,
      }),
    );
  }
  card.append(body);

  const actions = ui.createElement('div', { className: 'card-actions learning-card-actions' });
  if (request.status === 'pending' && offer.mentorId === currentUserId) {
    actions.append(
      ui.createButton({
        text: 'Accept request',
        variant: 'primary',
        onClick: () => {
          const result = learningService.reviewMentorshipRequest({
            requestId: request.id,
            reviewerId: currentUserId,
            decision: 'accepted',
          });
          if (result.ok) {
            ui.showToast('Request accepted. A learning group is ready.', 'success');
            router.navigate(`/learning/groups/${encodeURIComponent(result.group.id)}`);
          } else {
            const messages = {
              'capacity-reached': 'The offer has reached its learner capacity.',
              forbidden: 'Only the mentor who owns this offer can review requests.',
              'already-reviewed': 'This request has already been reviewed.',
            };
            ui.showToast(
              messages[result.reason] || `Could not accept request (${result.reason}).`,
              'error',
            );
          }
        },
      }),
    );
    actions.append(
      ui.createButton({
        text: 'Reject',
        variant: 'danger',
        onClick: () => {
          const confirmed = window.confirm(
            `Reject the mentorship request from ${learner?.displayName || 'this learner'}?`,
          );
          if (!confirmed) return;
          const result = learningService.reviewMentorshipRequest({
            requestId: request.id,
            reviewerId: currentUserId,
            decision: 'rejected',
          });
          if (result.ok) {
            ui.showToast('Mentorship request rejected.', 'success');
            router.dispatch();
          } else ui.showToast(`Could not reject request (${result.reason}).`, 'error');
        },
      }),
    );
  } else if (request.status === 'accepted') {
    const group = learningService.getGroupForRequest(request);
    if (group)
      actions.append(
        ui.createButton({
          text: 'Open learning group',
          variant: 'secondary',
          onClick: () => router.navigate(`/learning/groups/${encodeURIComponent(group.id)}`),
        }),
      );
  }
  if (actions.childElementCount) card.append(actions);
  return card;
}

export function renderMentorDetail(offerId) {
  const offer = storage.getById('mentorOffers', offerId);
  const currentUserId = auth.getCurrentUserId();
  const page = ui.createElement('div', { className: 'page-stack learning-detail-page' });
  page.append(
    ui.createElement('a', {
      className: 'back-link',
      text: '← Back to learning',
      attrs: { href: '#/learning' },
    }),
  );

  if (!offer) {
    ui.showEmpty(
      page,
      'This mentor offer could not be found. It may have been removed from the demo data.',
    );
    page.append(
      ui.createButton({
        text: 'Browse learning',
        variant: 'primary',
        onClick: () => router.navigate('/learning'),
      }),
    );
    document.querySelector('#app-content').replaceChildren(page);
    return;
  }

  const mentor = storage.getById('students', offer.mentorId);
  const isOwner = offer.mentorId === currentUserId;
  const acceptedCount = learningService.getOfferAcceptedCount(offer.id);
  const allRequests = learningService.getOfferRequests(offer.id);
  const requests = isOwner
    ? allRequests
    : allRequests.filter((request) => request.learnerId === currentUserId);
  const header = ui.createElement('section', { className: 'learning-detail-hero' });
  const heroCopy = ui.createElement('div', { className: 'learning-detail-hero-copy' });
  heroCopy.append(ui.createElement('div', { className: 'eyebrow', text: 'MENTOR OFFER' }));
  heroCopy.append(ui.createElement('h1', { text: offer.topics.join(' · ') }));
  heroCopy.append(
    ui.createElement('p', {
      text: `Guidance offered by ${mentor?.displayName || 'Unknown student'}`,
    }),
  );
  header.append(heroCopy);
  header.append(ui.createBadge(offer.status, offer.status === 'open' ? 'success' : 'neutral'));
  page.append(header);

  const content = ui.createElement('div', { className: 'learning-detail-grid' });
  const main = ui.createElement('div', { className: 'page-stack' });
  const overview = ui.createElement('section', { className: 'card learning-detail-card' });
  overview.append(ui.createElement('h2', { text: 'What this mentor offers' }));
  overview.append(ui.createElement('p', { text: offer.description }));
  const meta = ui.createElement('div', { className: 'learning-detail-meta' });
  meta.append(
    ui.createElement('div', {
      children: [
        ui.createElement('span', { className: 'metric-label', text: 'Mentor' }),
        ui.createElement('strong', { text: mentor?.displayName || 'Unknown student' }),
        ui.createElement('span', {
          className: 'learning-card-meta',
          text: mentor ? `Year ${mentor.year} · ${mentor.branch}` : '',
        }),
      ],
    }),
  );
  meta.append(
    ui.createElement('div', {
      children: [
        ui.createElement('span', { className: 'metric-label', text: 'Availability' }),
        ui.createElement('strong', { text: offer.availability || 'Not specified' }),
      ],
    }),
  );
  meta.append(
    ui.createElement('div', {
      children: [
        ui.createElement('span', { className: 'metric-label', text: 'Learner capacity' }),
        ui.createElement('strong', { text: `${acceptedCount} / ${offer.maxLearners}` }),
      ],
    }),
  );
  overview.append(meta);
  if (mentor) {
    overview.append(ui.createElement('h3', { text: 'Mentor skills' }));
    const skillTags = ui.createElement('div', { className: 'tag-list' });
    (mentor.skillsKnown || []).forEach((skill) =>
      skillTags.append(ui.createElement('span', { className: 'tag', text: skill })),
    );
    overview.append(skillTags);
  }
  main.append(overview);

  const activity = ui.createElement('section', { className: 'page-stack learning-section' });
  const activityHeading = ui.createElement('div', { className: 'section-heading' });
  const activityHeadingCopy = ui.createElement('div');
  activityHeadingCopy.append(ui.createElement('h2', { text: 'Mentorship requests' }));
  activityHeadingCopy.append(
    ui.createElement('p', {
      text: isOwner
        ? 'Review requests from students who want guidance.'
        : 'Request statuses are visible to the learner and offer owner.',
    }),
  );
  activityHeading.append(activityHeadingCopy);
  activity.append(activityHeading);
  const requestGrid = ui.createElement('div', { className: 'learning-request-list' });
  if (!requests.length)
    ui.showEmpty(requestGrid, 'No mentorship requests have been sent for this offer yet.');
  else
    requests.forEach((request) =>
      requestGrid.append(renderRequestCard(request, offer, currentUserId)),
    );
  activity.append(requestGrid);
  main.append(activity);
  content.append(main);

  const side = ui.createElement('aside', { className: 'page-stack learning-detail-sidebar' });
  const actionCard = ui.createElement('section', { className: 'card learning-detail-card' });
  actionCard.append(
    ui.createElement('h2', { text: isOwner ? 'Manage your offer' : 'Interested in learning?' }),
  );
  if (isOwner) {
    actionCard.append(
      ui.createElement('p', {
        text: 'You own this offer. Review incoming requests or close it when you are no longer available.',
      }),
    );
    if (offer.status === 'open') {
      actionCard.append(
        ui.createButton({
          text: 'Close mentor offer',
          variant: 'danger',
          className: 'btn-full',
          onClick: () => {
            const confirmed = window.confirm(
              'Close this mentor offer? Students will no longer be able to send new requests. Existing requests remain visible.',
            );
            if (!confirmed) return;
            const result = learningService.closeMentorOffer(offer.id, currentUserId);
            if (result.ok) {
              ui.showToast('Mentor offer closed.', 'success');
              router.dispatch();
            } else ui.showToast(`Could not close offer (${result.reason}).`, 'error');
          },
        }),
      );
    }
  } else {
    actionCard.append(
      ui.createElement('p', {
        text: 'Send a request to explain what kind of guidance would help you. The mentor decides whether to accept.',
      }),
    );
    const existingRequest = requests.find(
      (request) =>
        request.learnerId === currentUserId && ['pending', 'accepted'].includes(request.status),
    );
    if (offer.status === 'open' && acceptedCount < offer.maxLearners && !existingRequest) {
      actionCard.append(
        ui.createButton({
          text: 'Request mentorship',
          variant: 'primary',
          className: 'btn-full',
          onClick: () =>
            router.navigate(`/learning/offers/${encodeURIComponent(offer.id)}/request`),
        }),
      );
    } else if (existingRequest) {
      actionCard.append(
        ui.createBadge(
          `Your request: ${existingRequest.status}`,
          existingRequest.status === 'accepted' ? 'success' : 'warning',
        ),
      );
    } else if (offer.status !== 'open') {
      actionCard.append(ui.createBadge('Offer closed', 'neutral'));
    } else {
      actionCard.append(ui.createBadge('Capacity reached', 'warning'));
    }
  }
  side.append(actionCard);

  const rules = ui.createElement('section', { className: 'notice learning-detail-note' });
  rules.append(ui.createElement('span', { className: 'notice-mark', text: 'i' }));
  const rulesCopy = ui.createElement('div');
  rulesCopy.append(ui.createElement('strong', { text: 'Mentorship is opt-in' }));
  rulesCopy.append(
    ui.createElement('p', {
      text: 'Only an accepted request creates or joins a learning group. A profile skill alone does not imply that a student is offering mentorship.',
    }),
  );
  rules.append(rulesCopy);
  side.append(rules);
  content.append(side);
  page.append(content);
  document.querySelector('#app-content').replaceChildren(page);
}
