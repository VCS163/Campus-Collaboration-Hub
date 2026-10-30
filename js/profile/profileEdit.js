import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { storage } from '../shared/storage.js';
import { ui } from '../shared/ui.js';
import { validation, validators } from '../shared/validation.js';

function createField({
  label,
  name,
  type = 'text',
  value = '',
  placeholder = '',
  hint = '',
  maxLength,
  min = null,
  max = null,
}) {
  const group = ui.createElement('div', { className: 'form-group profile-form-group' });
  const id = `profile-field-${name}`;
  group.append(ui.createElement('label', { text: label, attrs: { for: id } }));
  const control =
    type === 'textarea'
      ? ui.createElement('textarea', {
          id,
          attrs: { name, placeholder, maxlength: maxLength || null, rows: 4 },
        })
      : ui.createElement('input', {
          id,
          attrs: { name, type, placeholder, maxlength: maxLength || null, min, max },
        });
  control.value = value ?? '';
  group.append(control);
  if (hint) group.append(ui.createElement('span', { className: 'form-hint', text: hint }));
  return { group, control };
}

function parseTags(value) {
  return [
    ...new Set(
      String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function renderProfileEdit() {
  const currentUser = auth.getCurrentUser();
  const page = ui.createElement('div', { className: 'page-stack profile-edit-page' });
  page.append(
    ui.createElement('a', {
      className: 'back-link',
      text: '← Back to profile',
      attrs: { href: '#/profile' },
    }),
  );

  if (!currentUser) {
    ui.showEmpty(
      page,
      'No demo student is available. Reset the demo data to restore the seed profiles.',
    );
    document.querySelector('#app-content').replaceChildren(page);
    return;
  }

  const heading = ui.createElement('section', { className: 'page-heading' });
  const copy = ui.createElement('div', { className: 'page-heading-copy' });
  copy.append(ui.createElement('div', { className: 'eyebrow', text: 'SHARED STUDENT IDENTITY' }));
  copy.append(ui.createElement('h1', { text: 'Edit your profile' }));
  copy.append(
    ui.createElement('p', {
      text: 'This profile is shared across Clubs, Projects, Learning and Community. Keep skills you can contribute separate from skills you are learning.',
    }),
  );
  heading.append(copy);
  page.append(heading);

  const form = ui.createElement('form', {
    className: 'card profile-form-card',
    attrs: { novalidate: true },
  });
  const intro = ui.createElement('div', { className: 'learning-form-intro' });
  intro.append(ui.createElement('h2', { text: 'Your student profile' }));
  intro.append(
    ui.createElement('p', { text: `Editing ${currentUser.displayName}'s demo profile.` }),
  );
  form.append(intro);

  const displayName = createField({
    label: 'Display name',
    name: 'displayName',
    value: currentUser.displayName,
    maxLength: 50,
    hint: '2–50 characters.',
  });
  const year = createField({
    label: 'Academic year',
    name: 'year',
    type: 'number',
    value: currentUser.year,
    min: 1,
    max: 5,
    hint: 'Enter a whole number from 1 to 5.',
  });
  const branch = createField({
    label: 'Department / branch',
    name: 'branch',
    value: currentUser.branch,
    maxLength: 30,
    hint: 'For example, ECE or CSE.',
  });
  const bio = createField({
    label: 'Short introduction',
    name: 'bio',
    type: 'textarea',
    value: currentUser.bio,
    maxLength: 500,
    hint: 'Maximum 500 characters.',
  });
  const skillsKnown = createField({
    label: 'Skills I can contribute',
    name: 'skillsKnown',
    value: (currentUser.skillsKnown || []).join(', '),
    maxLength: 500,
    hint: 'Comma-separated list, e.g. Python, C, PCB Design.',
  });
  const skillsLearning = createField({
    label: 'Skills I am learning',
    name: 'skillsLearning',
    value: (currentUser.skillsLearning || []).join(', '),
    maxLength: 500,
    hint: 'Comma-separated list. Keep this separate from skills you can contribute.',
  });
  const twoColumn = ui.createElement('div', { className: 'profile-form-two-column' });
  twoColumn.append(
    displayName.group,
    year.group,
    branch.group,
    bio.group,
    skillsKnown.group,
    skillsLearning.group,
  );
  form.append(twoColumn);

  const actions = ui.createElement('div', { className: 'learning-form-actions' });
  actions.append(
    ui.createButton({
      text: 'Cancel',
      variant: 'quiet',
      onClick: () => router.navigate('/profile'),
    }),
  );
  actions.append(ui.createButton({ text: 'Save profile', variant: 'primary', type: 'submit' }));
  form.append(actions);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    validation.clearFormErrors(form);
    const data = Object.fromEntries(new FormData(form).entries());
    const errors = {
      ...validation.validateForm(data, {
        displayName: [
          (value) => validators.required(value, 'Display name'),
          (value) => validators.minLength(value, 2, 'Display name'),
          (value) => validators.maxLength(value, 50, 'Display name'),
        ],
        year: [(value) => validators.isPositiveInt(value, 'Academic year')],
        branch: [
          (value) => validators.required(value, 'Department / branch'),
          (value) => validators.maxLength(value, 30, 'Department / branch'),
        ],
        bio: [(value) => validators.maxLength(value, 500, 'Introduction')],
        skillsKnown: [(value) => validators.maxLength(value, 500, 'Skills I can contribute')],
        skillsLearning: [(value) => validators.maxLength(value, 500, 'Skills I am learning')],
      }).errors,
    };
    if (Number(data.year) > 5) errors.year = 'Academic year must be between 1 and 5.';
    validation.showFormErrors(form, errors);
    if (Object.keys(errors).length) {
      ui.showToast('Please correct the highlighted fields.', 'error');
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    try {
      const updated = storage.update('students', currentUser.id, {
        displayName: data.displayName.trim(),
        year: Number(data.year),
        branch: data.branch.trim(),
        bio: data.bio.trim(),
        skillsKnown: parseTags(data.skillsKnown),
        skillsLearning: parseTags(data.skillsLearning),
      });
      if (!updated) {
        ui.showToast('Your profile could not be updated.', 'error');
        return;
      }
      auth.renderSwitcher();
      ui.showToast('Your profile has been updated.', 'success');
      router.navigate('/profile');
    } catch (error) {
      ui.showToast(error.message || 'Could not save your profile.', 'error');
    }
  });

  page.append(form);
  document.querySelector('#app-content').replaceChildren(page);
  displayName.control.focus();
}
