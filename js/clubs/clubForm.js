import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { storage } from '../shared/storage.js';
import { ui } from '../shared/ui.js';
import { validation, validators } from '../shared/validation.js';
import { CLUB_CATEGORIES } from './clubService.js';

function createField({
  label,
  name,
  type = 'text',
  placeholder = '',
  hint = '',
  required = false,
  maxLength,
}) {
  const group = ui.createElement('div', { className: 'form-group club-form-group' });
  const id = `club-field-${name}`;
  group.append(ui.createElement('label', { text: label, attrs: { for: id } }));

  let field;
  if (type === 'textarea') {
    field = ui.createElement('textarea', {
      id,
      attrs: {
        name,
        placeholder,
        required: required ? true : null,
        maxlength: maxLength || null,
        rows: name === 'goal' ? 3 : 5,
      },
    });
  } else if (type === 'select') {
    field = ui.createElement('select', { id, attrs: { name, required: required ? true : null } });
  } else {
    field = ui.createElement('input', {
      id,
      attrs: {
        name,
        type,
        placeholder,
        required: required ? true : null,
        maxlength: maxLength || null,
      },
    });
  }

  group.append(field);
  if (hint) group.append(ui.createElement('span', { className: 'form-hint', text: hint }));
  return { group, field };
}

function createCategoryField() {
  const { group, field } = createField({
    label: 'Category',
    name: 'category',
    type: 'select',
    required: true,
    hint: 'Choose the closest fit for your group.',
  });
  field.append(ui.createElement('option', { text: 'Choose a category', attrs: { value: '' } }));
  CLUB_CATEGORIES.forEach((category) =>
    field.append(ui.createElement('option', { text: category, attrs: { value: category } })),
  );
  return { group, field };
}

function createValidationRules() {
  return {
    title: [
      (value) => validators.required(value, 'Club name'),
      (value) => validators.minLength(value, 5, 'Club name'),
      (value) => validators.maxLength(value, 100, 'Club name'),
    ],
    description: [
      (value) => validators.required(value, 'Description'),
      (value) => validators.minLength(value, 10, 'Description'),
      (value) => validators.maxLength(value, 1000, 'Description'),
    ],
    category: [
      (value) => validators.required(value, 'Category'),
      (value) => validators.isEnum(value, CLUB_CATEGORIES, 'Category'),
    ],
    duration: [
      (value) => validators.required(value, 'Intended duration'),
      (value) => validators.minLength(value, 3, 'Intended duration'),
    ],
    goal: [
      (value) => validators.required(value, 'Group goal'),
      (value) => validators.minLength(value, 10, 'Group goal'),
      (value) => validators.maxLength(value, 500, 'Group goal'),
    ],
  };
}

export function renderClubForm() {
  const page = ui.createElement('div', { className: 'page-stack club-form-page' });
  const backLink = ui.createElement('a', {
    className: 'back-link',
    text: '← Back to clubs',
    attrs: { href: '#/clubs' },
  });
  page.append(backLink);

  const heading = ui.createElement('section', { className: 'page-heading' });
  const copy = ui.createElement('div', { className: 'page-heading-copy' });
  copy.append(ui.createElement('div', { className: 'eyebrow', text: 'START SOMETHING TEMPORARY' }));
  copy.append(ui.createElement('h1', { text: 'Create an interest group' }));
  copy.append(
    ui.createElement('p', {
      text: 'Give your group a clear purpose and an intended duration. It can be about exploring, learning, meeting or making something together.',
    }),
  );
  heading.append(copy);
  page.append(heading);

  const formCard = ui.createElement('section', { className: 'card club-form-card' });
  const formIntro = ui.createElement('div', { className: 'club-form-intro' });
  formIntro.append(ui.createElement('h2', { text: 'Tell students what this group is about' }));
  formIntro.append(
    ui.createElement('p', {
      text: 'You will be the organiser. For this MVP, students can join active clubs directly.',
    }),
  );
  formCard.append(formIntro);

  const form = ui.createElement('form', { className: 'club-form', attrs: { novalidate: true } });
  const title = createField({
    label: 'Club name',
    name: 'title',
    placeholder: 'e.g. Weekend Robotics Circle',
    required: true,
    maxLength: 100,
  });
  const description = createField({
    label: 'Description',
    name: 'description',
    type: 'textarea',
    placeholder: 'What will members explore or do together?',
    required: true,
    maxLength: 1000,
    hint: '10–1000 characters.',
  });
  const category = createCategoryField();
  const duration = createField({
    label: 'Intended duration',
    name: 'duration',
    placeholder: 'e.g. 4 weeks or one semester',
    required: true,
    hint: 'A time boundary helps members understand the commitment.',
  });
  const goal = createField({
    label: 'Group goal',
    name: 'goal',
    type: 'textarea',
    placeholder: 'What would make this group meaningful by the end?',
    required: true,
    maxLength: 500,
    hint: '10–500 characters. A concrete deliverable is not required.',
  });

  const twoColumn = ui.createElement('div', { className: 'club-form-two-column' });
  twoColumn.append(category.group, duration.group);
  form.append(title.group, description.group, twoColumn, goal.group);

  const note = ui.createElement('div', { className: 'notice club-form-note' });
  note.append(
    ui.createElement('span', {
      className: 'notice-mark',
      text: 'i',
      attrs: { 'aria-hidden': 'true' },
    }),
  );
  const noteCopy = ui.createElement('div');
  noteCopy.append(
    ui.createElement('strong', { text: 'Clubs are different from ongoing communities' }),
  );
  noteCopy.append(
    ui.createElement('p', {
      text: 'A club has a purpose and intended duration. When that period or purpose ends, its organiser can archive it. Discussion-only and exploration groups are welcome.',
    }),
  );
  note.append(noteCopy);
  form.append(note);

  const actions = ui.createElement('div', { className: 'club-form-actions' });
  actions.append(
    ui.createElement('a', {
      className: 'btn btn-secondary',
      text: 'Cancel',
      attrs: { href: '#/clubs' },
    }),
  );
  const submitButton = ui.createElement('button', {
    className: 'btn btn-primary',
    text: 'Create club',
    attrs: { type: 'submit' },
  });
  actions.append(submitButton);
  form.append(actions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    validation.clearFormErrors(form);
    const formData = Object.fromEntries(
      [...new FormData(form).entries()].map(([name, value]) => [
        name,
        typeof value === 'string' ? value.trim() : value,
      ]),
    );
    const result = validation.validateForm(formData, createValidationRules());

    if (!result.valid) {
      validation.showFormErrors(form, result.errors);
      const firstInvalid = form.elements.namedItem(Object.keys(result.errors)[0]);
      firstInvalid?.focus();
      ui.showToast('Please correct the highlighted fields.', 'error');
      return;
    }

    const organiserId = auth.getCurrentUserId();
    if (!organiserId || !storage.getById('students', organiserId)) {
      ui.showToast('Select a valid demo student before creating a club.', 'error');
      return;
    }

    try {
      const createdClub = storage.insert('clubs', {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        duration: formData.duration,
        goal: formData.goal,
        organiserId,
        status: 'active',
        archivedAt: null,
      });
      ui.showToast('Club created successfully.', 'success');
      router.navigate(`/clubs/${encodeURIComponent(createdClub.id)}`);
    } catch (error) {
      ui.showToast(error.message || 'Could not create this club.', 'error');
    }
  });

  formCard.append(form);
  page.append(formCard);
  document.querySelector('#app-content').replaceChildren(page);
  title.field.focus();
}
