import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { storage } from '../shared/storage.js';
import { ui } from '../shared/ui.js';
import { validation, validators } from '../shared/validation.js';
import { learningService } from './learningService.js';

export function renderMentorshipRequestForm(offerId) {
  const offer = storage.getById('mentorOffers', offerId);
  const currentUser = auth.getCurrentUser();
  const page = ui.createElement('div', { className: 'page-stack learning-form-page' });
  page.append(ui.createElement('a', { className: 'back-link', text: '← Back to mentor offer', attrs: { href: `#/learning/offers/${encodeURIComponent(offerId)}` } }));

  if (!offer || !currentUser) {
    ui.showEmpty(page, 'This mentor offer or demo student could not be found.');
    page.append(ui.createButton({ text: 'Browse learning', variant: 'primary', onClick: () => router.navigate('/learning') }));
    document.querySelector('#app-content').replaceChildren(page);
    return;
  }
  const mentor = storage.getById('students', offer.mentorId);
  const alreadyRequested = storage.query('mentorshipRequests', (request) =>
    request.offerId === offer.id && request.learnerId === currentUser.id && ['pending', 'accepted'].includes(request.status),
  )[0];
  if (offer.mentorId === currentUser.id) {
    ui.showEmpty(page, 'You created this mentor offer. You cannot request mentorship from yourself.');
    page.append(ui.createButton({ text: 'Back to offer', variant: 'primary', onClick: () => router.navigate(`/learning/offers/${encodeURIComponent(offer.id)}`) }));
    document.querySelector('#app-content').replaceChildren(page);
    return;
  }
  if (offer.status !== 'open') {
    ui.showEmpty(page, 'This mentor offer is closed and is not accepting new requests.');
    page.append(ui.createButton({ text: 'Back to offer', variant: 'primary', onClick: () => router.navigate(`/learning/offers/${encodeURIComponent(offer.id)}`) }));
    document.querySelector('#app-content').replaceChildren(page);
    return;
  }
  if (alreadyRequested) {
    ui.showEmpty(page, `You already have a ${alreadyRequested.status} request for this offer.`);
    page.append(ui.createBadge(alreadyRequested.status, alreadyRequested.status === 'accepted' ? 'success' : 'warning'));
    page.append(ui.createButton({ text: 'Back to learning', variant: 'primary', onClick: () => router.navigate('/learning') }));
    document.querySelector('#app-content').replaceChildren(page);
    return;
  }
  if (learningService.getOfferAcceptedCount(offer.id) >= offer.maxLearners) {
    ui.showEmpty(page, 'This mentor offer has reached its current learner capacity.');
    page.append(ui.createButton({ text: 'Back to learning', variant: 'primary', onClick: () => router.navigate('/learning') }));
    document.querySelector('#app-content').replaceChildren(page);
    return;
  }

  const heading = ui.createElement('section', { className: 'page-heading' });
  const copy = ui.createElement('div', { className: 'page-heading-copy' });
  copy.append(ui.createElement('div', { className: 'eyebrow', text: 'MENTORSHIP REQUEST' }));
  copy.append(ui.createElement('h1', { text: 'Ask for guidance' }));
  copy.append(ui.createElement('p', { text: `Send a request to ${mentor?.displayName || 'this mentor'}. They can accept or reject it.` }));
  heading.append(copy);
  page.append(heading);

  const context = ui.createElement('section', { className: 'card learning-request-context' });
  context.append(ui.createElement('span', { className: 'eyebrow', text: 'MENTOR OFFER' }));
  context.append(ui.createElement('h2', { text: offer.topics.join(' · ') }));
  context.append(ui.createElement('p', { text: `Mentor · ${mentor?.displayName || 'Unknown student'}` }));
  context.append(ui.createElement('p', { text: offer.description }));
  page.append(context);

  const form = ui.createElement('form', { className: 'card learning-form-card', attrs: { novalidate: true } });
  const objectiveGroup = ui.createElement('div', { className: 'form-group learning-form-group' });
  objectiveGroup.append(ui.createElement('label', { text: 'What do you want to achieve?', attrs: { for: 'mentorship-objective' } }));
  const objective = ui.createElement('textarea', { id: 'mentorship-objective', attrs: { name: 'objective', rows: 4, maxlength: 350, required: true, placeholder: 'Describe the learning outcome you are working towards…' } });
  objectiveGroup.append(objective);
  objectiveGroup.append(ui.createElement('span', { className: 'form-hint', text: 'Required · 10–350 characters.' }));
  const messageGroup = ui.createElement('div', { className: 'form-group learning-form-group' });
  messageGroup.append(ui.createElement('label', { text: 'Additional message to the mentor (optional)', attrs: { for: 'mentorship-message' } }));
  const message = ui.createElement('textarea', { id: 'mentorship-message', attrs: { name: 'message', rows: 3, maxlength: 100, placeholder: 'Anything else the mentor should know…' } });
  messageGroup.append(message);
  messageGroup.append(ui.createElement('span', { className: 'form-hint', text: 'Optional · 100 characters maximum. Your current skills and skills you are learning are visible on your shared demo profile.' }));
  form.append(objectiveGroup, messageGroup);

  const actions = ui.createElement('div', { className: 'learning-form-actions' });
  actions.append(ui.createButton({ text: 'Cancel', variant: 'quiet', onClick: () => router.navigate(`/learning/offers/${encodeURIComponent(offer.id)}`) }));
  actions.append(ui.createButton({ text: 'Send mentorship request', variant: 'primary', type: 'submit' }));
  form.append(actions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    validation.clearFormErrors(form);
    const data = Object.fromEntries(new FormData(form).entries());
    const validationResult = validation.validateForm(data, {
      objective: [
        (value) => validators.required(value, 'Learning objective'),
        (value) => validators.minLength(value, 10, 'Learning objective'),
        (value) => validators.maxLength(value, 350, 'Learning objective'),
      ],
      message: [(value) => validators.maxLength(value, 100, 'Additional message')],
    });
    validation.showFormErrors(form, validationResult.errors);
    if (!validationResult.valid) {
      ui.showToast('Please correct the highlighted field.', 'error');
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    try {
      const combinedMessage = `Learning objective: ${data.objective.trim()}${data.message.trim() ? `\nAdditional message: ${data.message.trim()}` : ''}`;
      const result = learningService.createMentorshipRequest({ learnerId: currentUser.id, offerId: offer.id, message: combinedMessage });
      if (!result.ok) {
        const messages = {
          duplicate: 'You already have an active request for this offer.',
          'capacity-reached': 'This offer has reached its learner capacity.',
          'self-request': 'You cannot request mentorship from your own offer.',
          'offer-closed': 'This offer is closed.',
        };
        ui.showToast(messages[result.reason] || `Request could not be sent (${result.reason}).`, 'error');
        return;
      }
      ui.showToast('Mentorship request sent to the mentor.', 'success');
      router.navigate('/learning');
    } catch (error) {
      ui.showToast(error.message || 'Could not send the mentorship request.', 'error');
    }
  });

  page.append(form);
  document.querySelector('#app-content').replaceChildren(page);
}
