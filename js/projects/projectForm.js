import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { ui } from '../shared/ui.js';
import { validation, validators } from '../shared/validation.js';
import { PROJECT_CATEGORIES, projectService } from './projectService.js';

let nextRoleIndex = 0;

function createField({
  label,
  name,
  type = 'text',
  placeholder = '',
  hint = '',
  required = false,
  maxLength,
  rows = 4,
}) {
  const group = ui.createElement('div', { className: 'form-group project-form-group' });
  const id = `project-field-${name}`;
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
        rows,
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

function createRoleBlock(index, onRemove) {
  const block = ui.createElement('section', {
    className: 'project-role-form-card',
    attrs: { 'data-role-index': index },
  });
  const heading = ui.createElement('div', { className: 'project-role-form-heading' });
  heading.append(ui.createElement('h3', { text: `Contributor role ${index + 1}` }));
  if (index > 0)
    heading.append(
      ui.createButton({
        text: 'Remove',
        variant: 'quiet',
        className: 'btn-small',
        onClick: () => onRemove(block),
      }),
    );
  block.append(heading);

  const title = createField({
    label: 'Role title',
    name: `roleTitle_${index}`,
    placeholder: 'e.g. Frontend Developer',
    required: true,
    maxLength: 80,
  });
  const description = createField({
    label: 'What will this contributor do?',
    name: `roleDescription_${index}`,
    type: 'textarea',
    placeholder: 'Describe the contribution and responsibilities…',
    required: true,
    maxLength: 1000,
    rows: 3,
  });
  const skills = createField({
    label: 'Skills that may help',
    name: `roleSkills_${index}`,
    placeholder: 'e.g. HTML, CSS, JavaScript',
    hint: 'Optional. Separate skills with commas.',
  });
  block.append(title.group, description.group, skills.group);
  return block;
}

function validationRules() {
  return {
    title: [
      (value) => validators.required(value, 'Opportunity title'),
      (value) => validators.minLength(value, 5, 'Opportunity title'),
      (value) => validators.maxLength(value, 100, 'Opportunity title'),
    ],
    description: [
      (value) => validators.required(value, 'Description'),
      (value) => validators.minLength(value, 10, 'Description'),
      (value) => validators.maxLength(value, 2000, 'Description'),
    ],
    category: [
      (value) => validators.required(value, 'Category'),
      (value) => validators.isEnum(value, PROJECT_CATEGORIES, 'Category'),
    ],
  };
}

export function renderProjectForm() {
  const currentUser = auth.getCurrentUser();
  if (!currentUser) {
    const fallback = ui.createElement('section', { className: 'empty-state' });
    fallback.append(ui.createElement('h2', { text: 'Choose a demo student first' }));
    fallback.append(ui.createElement('p', { text: 'A project opportunity must have an owner.' }));
    document.querySelector('#app-content').replaceChildren(fallback);
    return;
  }

  nextRoleIndex = 0;
  const page = ui.createElement('div', { className: 'page-stack project-form-page' });
  page.append(
    ui.createElement('a', {
      className: 'back-link',
      text: '← Back to projects',
      attrs: { href: '#/projects' },
    }),
  );

  const heading = ui.createElement('section', { className: 'page-heading' });
  const headingCopy = ui.createElement('div', { className: 'page-heading-copy' });
  headingCopy.append(
    ui.createElement('div', {
      className: 'eyebrow',
      text: 'PROJECT COLLABORATION · NEW OPPORTUNITY',
    }),
  );
  headingCopy.append(ui.createElement('h1', { text: 'Bring the right people into your project.' }));
  headingCopy.append(
    ui.createElement('p', {
      text: `You're posting as ${currentUser.displayName}. Describe the outcome and the contributor roles students can apply for.`,
    }),
  );
  heading.append(headingCopy);
  page.append(heading);

  const form = ui.createElement('form', {
    className: 'card project-form-card',
    attrs: { novalidate: true },
  });
  const intro = ui.createElement('div', { className: 'project-form-intro' });
  intro.append(
    ui.createElement('span', { className: 'eyebrow', text: 'STEP 1 · PROJECT DETAILS' }),
  );
  intro.append(ui.createElement('h2', { text: 'Tell students what you are building' }));
  intro.append(
    ui.createElement('p', {
      text: 'Keep the scope clear. Students should understand the idea before deciding to apply.',
    }),
  );
  form.append(intro);

  const fields = ui.createElement('div', { className: 'project-form-fields' });
  const title = createField({
    label: 'Opportunity title',
    name: 'title',
    placeholder: 'e.g. Campus App Redesign',
    required: true,
    maxLength: 100,
  });
  const description = createField({
    label: 'Description',
    name: 'description',
    type: 'textarea',
    placeholder: 'What problem are you solving? What would the team work on?',
    required: true,
    maxLength: 2000,
    rows: 5,
    hint: 'Minimum 10 characters. Maximum 2,000 characters.',
  });
  const category = createField({
    label: 'Category',
    name: 'category',
    type: 'select',
    required: true,
  });
  category.field.append(
    ui.createElement('option', { text: 'Choose a category', attrs: { value: '' } }),
  );
  PROJECT_CATEGORIES.forEach((item) =>
    category.field.append(ui.createElement('option', { text: item, attrs: { value: item } })),
  );
  fields.append(title.group, description.group, category.group);

  const beginnerLabel = ui.createElement('label', {
    className: 'project-checkbox-row',
    attrs: { for: 'project-beginner-friendly' },
  });
  const beginnerCheckbox = ui.createElement('input', {
    id: 'project-beginner-friendly',
    attrs: { type: 'checkbox', name: 'beginnerFriendly' },
  });
  const beginnerCopy = ui.createElement('span');
  beginnerCopy.append(ui.createElement('strong', { text: 'Beginner friendly' }));
  beginnerCopy.append(
    ui.createElement('small', { text: 'Encourage students who are still learning to apply.' }),
  );
  beginnerLabel.append(beginnerCheckbox, beginnerCopy);
  fields.append(beginnerLabel);
  form.append(fields);

  const rolesSection = ui.createElement('section', { className: 'project-roles-form-section' });
  const rolesIntro = ui.createElement('div', { className: 'project-roles-form-intro' });
  rolesIntro.append(
    ui.createElement('span', { className: 'eyebrow', text: 'STEP 2 · CONTRIBUTOR ROLES' }),
  );
  rolesIntro.append(ui.createElement('h2', { text: 'Who are you looking for?' }));
  rolesIntro.append(
    ui.createElement('p', {
      text: 'Add at least one role. Students apply to a specific role, not just to the project in general.',
    }),
  );
  rolesSection.append(rolesIntro);
  const roleBlocks = ui.createElement('div', { className: 'project-role-form-list' });
  const addRoleBlock = () => {
    if (roleBlocks.children.length >= 5) {
      ui.showToast('You can add up to five roles to one opportunity in this MVP.', 'info');
      return;
    }
    const index = nextRoleIndex++;
    const block = createRoleBlock(index, (roleBlock) => {
      roleBlock.remove();
      Array.from(roleBlocks.children).forEach((item, visibleIndex) => {
        const titleElement = item.querySelector('h3');
        if (titleElement) titleElement.textContent = `Contributor role ${visibleIndex + 1}`;
      });
    });
    roleBlocks.append(block);
  };
  addRoleBlock();
  rolesSection.append(roleBlocks);
  rolesSection.append(
    ui.createButton({ text: '+ Add another role', variant: 'secondary', onClick: addRoleBlock }),
  );
  form.append(rolesSection);

  const footer = ui.createElement('div', { className: 'project-form-actions' });
  footer.append(
    ui.createButton({
      text: 'Cancel',
      variant: 'quiet',
      onClick: () => router.navigate('/projects'),
    }),
  );
  footer.append(
    ui.createButton({ text: 'Publish opportunity', variant: 'primary', type: 'submit' }),
  );
  form.append(footer);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    validation.clearFormErrors(form);

    const formData = Object.fromEntries(new FormData(form).entries());
    const rules = validationRules();
    const errors = { ...validation.validateForm(formData, rules).errors };
    const blocks = Array.from(roleBlocks.children);
    if (!blocks.length) errors.roleTitle_0 = 'Add at least one contributor role.';

    const roleValues = blocks.map((block) => {
      const index = Number(block.dataset.roleIndex);
      const roleTitle = form.elements.namedItem(`roleTitle_${index}`)?.value ?? '';
      const roleDescription = form.elements.namedItem(`roleDescription_${index}`)?.value ?? '';
      const roleSkills = form.elements.namedItem(`roleSkills_${index}`)?.value ?? '';
      if (roleTitle.trim().length < 3)
        errors[`roleTitle_${index}`] = 'Role title must be at least 3 characters.';
      if (roleTitle.trim().length > 80)
        errors[`roleTitle_${index}`] = 'Role title must be at most 80 characters.';
      if (roleDescription.trim().length < 10)
        errors[`roleDescription_${index}`] = 'Role description must be at least 10 characters.';
      if (roleDescription.trim().length > 1000)
        errors[`roleDescription_${index}`] = 'Role description must be at most 1,000 characters.';
      return { roleTitle, description: roleDescription, skills: roleSkills };
    });

    validation.showFormErrors(form, errors);
    if (Object.keys(errors).length) {
      ui.showToast('Please correct the highlighted fields.', 'error');
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    try {
      const created = projectService.createOpportunity(
        auth.getCurrentUserId(),
        {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          beginnerFriendly: beginnerCheckbox.checked,
        },
        roleValues,
      );
      if (!created.ok) {
        ui.showToast(`Could not publish the opportunity (${created.reason}).`, 'error');
        return;
      }
      ui.showToast('Opportunity published. Students can now apply to its roles.', 'success');
      router.navigate(`/projects/${encodeURIComponent(created.opportunity.id)}`);
    } catch (error) {
      ui.showToast(error.message || 'Could not save the opportunity.', 'error');
    }
  });

  page.append(form);
  document.querySelector('#app-content').replaceChildren(page);
  title.field.focus();
}
