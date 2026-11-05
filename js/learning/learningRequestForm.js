import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { ui } from '../shared/ui.js';
import { validation, validators } from '../shared/validation.js';
import { LEARNING_MODES, learningService } from './learningService.js';

function textField({ label, name, type = 'text', placeholder = '', hint = '', maxLength, required = false }) {
  const group = ui.createElement('div', { className: 'form-group learning-form-group' });
  const id = `learning-request-${name}`;
  group.append(ui.createElement('label', { text: label, attrs: { for: id } }));
  const control = type === 'textarea'
    ? ui.createElement('textarea', { id, attrs: { name, placeholder, required: required ? true : null, maxlength: maxLength || null, rows: 5 } })
    : ui.createElement('input', { id, attrs: { name, type, placeholder, required: required ? true : null, maxlength: maxLength || null } });
  group.append(control);
  if (hint) group.append(ui.createElement('span', { className: 'form-hint', text: hint }));
  return { group, control };
}

export function renderLearningRequestForm() {
  const page = ui.createElement('div', { className: 'page-stack learning-form-page' });
  page.append(ui.createElement('a', { className: 'back-link', text: '← Back to learning', attrs: { href: '#/learning' } }));
  const heading = ui.createElement('section', { className: 'page-heading' });
  const copy = ui.createElement('div', { className: 'page-heading-copy' });
  copy.append(ui.createElement('div', { className: 'eyebrow', text: 'MAKE YOUR GOAL VISIBLE' }));
  copy.append(ui.createElement('h1', { text: 'Create a learning request' }));
  copy.append(ui.createElement('p', { text: 'Describe what you want to learn and the outcome you are working towards. Students can discover your request independently of mentor offers.' }));
  heading.append(copy);
  page.append(heading);

  const form = ui.createElement('form', { className: 'card learning-form-card', attrs: { novalidate: true } });
  const intro = ui.createElement('div', { className: 'learning-form-intro' });
  intro.append(ui.createElement('h2', { text: 'Your learning goal' }));
  intro.append(ui.createElement('p', { text: `This request will be published under ${auth.getCurrentUser()?.displayName || 'the current demo student'}.` }));
  form.append(intro);

  const topic = textField({ label: 'What do you want to learn?', name: 'topic', placeholder: 'e.g. Embedded C fundamentals', required: true, maxLength: 80, hint: '3–80 characters.' });
  const goal = textField({ label: 'What do you want to achieve?', name: 'goal', type: 'textarea', placeholder: 'Describe the skill, problem or outcome you want to work towards…', required: true, maxLength: 500, hint: '10–500 characters. Be specific about the outcome you want.' });
  const modeGroup = ui.createElement('div', { className: 'form-group learning-form-group' });
  modeGroup.append(ui.createElement('label', { text: 'Preferred learning mode', attrs: { for: 'learning-request-mode' } }));
  const mode = ui.createElement('select', { id: 'learning-request-mode', attrs: { name: 'mode' } });
  mode.append(ui.createElement('option', { text: 'No preference', attrs: { value: '' } }));
  LEARNING_MODES.forEach((value) => mode.append(ui.createElement('option', { text: value.replaceAll('-', ' '), attrs: { value } })));
  modeGroup.append(mode);
  modeGroup.append(ui.createElement('span', { className: 'form-hint', text: 'Optional. Choose the learning format that suits you.' }));

  form.append(topic.group, goal.group, modeGroup);
  const actions = ui.createElement('div', { className: 'learning-form-actions' });
  actions.append(ui.createButton({ text: 'Cancel', variant: 'quiet', onClick: () => router.navigate('/learning') }));
  actions.append(ui.createButton({ text: 'Publish learning request', variant: 'primary', type: 'submit' }));
  form.append(actions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    validation.clearFormErrors(form);
    const data = Object.fromEntries(new FormData(form).entries());
    const errors = { ...validation.validateForm(data, {
      topic: [
        (value) => validators.required(value, 'Topic'),
        (value) => validators.minLength(value, 3, 'Topic'),
        (value) => validators.maxLength(value, 80, 'Topic'),
      ],
      goal: [
        (value) => validators.required(value, 'Learning goal'),
        (value) => validators.minLength(value, 10, 'Learning goal'),
        (value) => validators.maxLength(value, 500, 'Learning goal'),
      ],
      mode: [(value) => validators.isEnum(value, LEARNING_MODES, 'Learning mode')],
    }).errors };
    validation.showFormErrors(form, errors);
    if (Object.keys(errors).length) {
      ui.showToast('Please correct the highlighted fields.', 'error');
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    try {
      const result = learningService.createLearningRequest(auth.getCurrentUserId(), data);
      if (!result.ok) {
        ui.showToast(`Could not publish learning request (${result.reason}).`, 'error');
        return;
      }
      ui.showToast('Your learning request is now visible.', 'success');
      router.navigate('/learning');
    } catch (error) {
      ui.showToast(error.message || 'Could not save the learning request.', 'error');
    }
  });

  page.append(form);
  document.querySelector('#app-content').replaceChildren(page);
  topic.control.focus();
}
