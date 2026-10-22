import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { ui } from '../shared/ui.js';
import { validation, validators } from '../shared/validation.js';
import { learningService } from './learningService.js';

function field({ label, name, type = 'text', placeholder = '', hint = '', required = false, maxLength, min = null }) {
  const group = ui.createElement('div', { className: 'form-group learning-form-group' });
  const id = `learning-field-${name}`;
  group.append(ui.createElement('label', { text: label, attrs: { for: id } }));
  let control;
  if (type === 'textarea') {
    control = ui.createElement('textarea', { id, attrs: { name, placeholder, required: required ? true : null, maxlength: maxLength || null, rows: 4 } });
  } else {
    control = ui.createElement('input', { id, attrs: { name, type, placeholder, required: required ? true : null, maxlength: maxLength || null, min: min ?? null } });
  }
  group.append(control);
  if (hint) group.append(ui.createElement('span', { className: 'form-hint', text: hint }));
  return { group, control };
}

export function renderMentorForm() {
  const page = ui.createElement('div', { className: 'page-stack learning-form-page' });
  page.append(ui.createElement('a', { className: 'back-link', text: '← Back to learning', attrs: { href: '#/learning' } }));

  const heading = ui.createElement('section', { className: 'page-heading' });
  const copy = ui.createElement('div', { className: 'page-heading-copy' });
  copy.append(ui.createElement('div', { className: 'eyebrow', text: 'SHARE WHAT YOU KNOW' }));
  copy.append(ui.createElement('h1', { text: 'Create a mentor offer' }));
  copy.append(ui.createElement('p', { text: 'Make your topics, approach and availability clear. Students will request guidance from this specific offer.' }));
  heading.append(copy);
  page.append(heading);

  const form = ui.createElement('form', { className: 'card learning-form-card', attrs: { novalidate: true } });
  const intro = ui.createElement('div', { className: 'learning-form-intro' });
  intro.append(ui.createElement('h2', { text: 'Your mentorship offer' }));
  intro.append(ui.createElement('p', { text: `This offer will be published under ${auth.getCurrentUser()?.displayName || 'the current demo student'}. A profile skill does not automatically create a mentor offer.` }));
  form.append(intro);

  const topics = field({ label: 'Topics you can teach', name: 'topics', placeholder: 'e.g. Python, Machine Learning, Data Analysis', required: true, maxLength: 240, hint: 'Enter one or more comma-separated topics. Each topic must contain 2–60 characters.' });
  const description = field({ label: 'What kind of guidance can you offer?', name: 'description', type: 'textarea', placeholder: 'Explain what you can help students learn and how you approach mentoring…', required: true, maxLength: 1000, hint: '10–1,000 characters.' });
  const availability = field({ label: 'Availability', name: 'availability', placeholder: 'e.g. Two evenings per week', maxLength: 120, hint: 'Optional. Maximum 120 characters.' });
  const capacity = field({ label: 'Maximum learners at one time', name: 'maxLearners', type: 'number', required: true, min: 1, hint: 'Enter a positive whole number.' });

  const twoColumn = ui.createElement('div', { className: 'learning-form-two-column' });
  twoColumn.append(availability.group, capacity.group);
  form.append(topics.group, description.group, twoColumn);

  const note = ui.createElement('div', { className: 'notice learning-form-note' });
  note.append(ui.createElement('span', { className: 'notice-mark', text: 'i', attrs: { 'aria-hidden': 'true' } }));
  const noteCopy = ui.createElement('div');
  noteCopy.append(ui.createElement('strong', { text: 'You remain in control' }));
  noteCopy.append(ui.createElement('p', { text: 'You can close your offer later to stop new mentorship requests. Existing requests and learning groups remain available.' }));
  note.append(noteCopy);
  form.append(note);

  const actions = ui.createElement('div', { className: 'learning-form-actions' });
  actions.append(ui.createButton({ text: 'Cancel', variant: 'quiet', onClick: () => router.navigate('/learning') }));
  actions.append(ui.createButton({ text: 'Publish mentor offer', variant: 'primary', type: 'submit' }));
  form.append(actions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    validation.clearFormErrors(form);
    const data = Object.fromEntries(new FormData(form).entries());
    const errors = { ...validation.validateForm(data, {
      topics: [(value) => validators.required(value, 'Topics')],
      description: [
        (value) => validators.required(value, 'Description'),
        (value) => validators.minLength(value, 10, 'Description'),
        (value) => validators.maxLength(value, 1000, 'Description'),
      ],
      availability: [(value) => validators.maxLength(value, 120, 'Availability')],
      maxLearners: [(value) => validators.isPositiveInt(value, 'Maximum learners')],
    }).errors };
    const topicList = String(data.topics || '').split(',').map((topic) => topic.trim()).filter(Boolean);
    if (topicList.length < 1 || topicList.some((topic) => topic.length < 2 || topic.length > 60)) {
      errors.topics = 'Add at least one topic. Each topic must be 2–60 characters.';
    }
    validation.showFormErrors(form, errors);
    if (Object.keys(errors).length) {
      ui.showToast('Please correct the highlighted fields.', 'error');
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    try {
      const result = learningService.createMentorOffer(auth.getCurrentUserId(), {
        topics: topicList,
        description: data.description,
        availability: data.availability,
        maxLearners: Number(data.maxLearners),
      });
      if (!result.ok) {
        ui.showToast(`Could not publish offer (${result.reason}).`, 'error');
        return;
      }
      ui.showToast('Your mentor offer is now visible to students.', 'success');
      router.navigate(`/learning/offers/${encodeURIComponent(result.offer.id)}`);
    } catch (error) {
      ui.showToast(error.message || 'Could not save the mentor offer.', 'error');
    }
  });

  page.append(form);
  document.querySelector('#app-content').replaceChildren(page);
  topics.control.focus();
}
