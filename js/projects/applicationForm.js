import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { storage } from '../shared/storage.js';
import { ui } from '../shared/ui.js';
import { validation, validators } from '../shared/validation.js';
import { projectService } from './projectService.js';

function createField({
  label,
  name,
  type = 'text',
  placeholder = '',
  required = false,
  maxLength,
  rows = 4,
  hint = '',
}) {
  const group = ui.createElement('div', { className: 'form-group project-form-group' });
  const id = `application-field-${name}`;
  group.append(ui.createElement('label', { text: label, attrs: { for: id } }));
  const field =
    type === 'textarea'
      ? ui.createElement('textarea', {
          id,
          attrs: {
            name,
            placeholder,
            required: required ? true : null,
            maxlength: maxLength || null,
            rows,
          },
        })
      : ui.createElement('input', {
          id,
          attrs: {
            name,
            type,
            placeholder,
            required: required ? true : null,
            maxlength: maxLength || null,
          },
        });
  group.append(field);
  if (hint) group.append(ui.createElement('span', { className: 'form-hint', text: hint }));
  return { group, field };
}

export function renderApplicationForm(opportunityId, roleId) {
  const opportunity = storage.getById('opportunities', opportunityId);
  const role = storage.getById('projectRoles', roleId);
  const applicantId = auth.getCurrentUserId();
  const applicant = auth.getCurrentUser();
  const owner = opportunity ? storage.getById('students', opportunity.ownerId) : null;
  const container = document.querySelector('#app-content');

  const page = ui.createElement('div', { className: 'page-stack project-application-page' });
  page.append(
    ui.createElement('a', {
      className: 'back-link',
      text: '← Back to opportunity',
      attrs: { href: `#/projects/${encodeURIComponent(opportunityId)}` },
    }),
  );

  if (!opportunity || !role || role.opportunityId !== opportunityId || !applicant) {
    ui.showEmpty(
      page,
      'This opportunity or role could not be found. Return to the project directory and choose an available role.',
    );
    page.append(
      ui.createButton({
        text: 'Browse opportunities',
        variant: 'primary',
        onClick: () => router.navigate('/projects'),
      }),
    );
    container.replaceChildren(page);
    return;
  }

  if (opportunity.ownerId === applicantId) {
    ui.showEmpty(page, 'You own this opportunity. You cannot apply to your own contributor roles.');
    page.append(
      ui.createButton({
        text: 'Back to opportunity',
        variant: 'primary',
        onClick: () => router.navigate(`/projects/${encodeURIComponent(opportunityId)}`),
      }),
    );
    container.replaceChildren(page);
    return;
  }

  if (!['open', 'active'].includes(opportunity.status)) {
    ui.showEmpty(page, 'This opportunity is no longer accepting applications.');
    page.append(
      ui.createButton({
        text: 'Back to opportunity',
        variant: 'primary',
        onClick: () => router.navigate(`/projects/${encodeURIComponent(opportunityId)}`),
      }),
    );
    container.replaceChildren(page);
    return;
  }

  const existing = storage.query(
    'applications',
    (application) => application.roleId === roleId && application.applicantId === applicantId,
  )[0];
  if (existing) {
    const message =
      existing.status === 'pending'
        ? 'Your application is already with the project owner.'
        : `You have already applied to this role. The decision is ${existing.status}.`;
    ui.showEmpty(page, message);
    page.append(
      ui.createBadge(
        `Application ${existing.status}`,
        existing.status === 'accepted'
          ? 'success'
          : existing.status === 'rejected'
            ? 'danger'
            : 'warning',
      ),
    );
    page.append(
      ui.createButton({
        text: 'Back to opportunity',
        variant: 'primary',
        onClick: () => router.navigate(`/projects/${encodeURIComponent(opportunityId)}`),
      }),
    );
    container.replaceChildren(page);
    return;
  }

  const heading = ui.createElement('section', { className: 'page-heading' });
  const copy = ui.createElement('div', { className: 'page-heading-copy' });
  copy.append(
    ui.createElement('div', { className: 'eyebrow', text: 'PROJECT COLLABORATION · APPLICATION' }),
  );
  copy.append(ui.createElement('h1', { text: 'Tell the owner why you want to contribute.' }));
  copy.append(
    ui.createElement('p', {
      text: `Applying as ${applicant.displayName}. Be honest about what you can contribute and what you hope to learn.`,
    }),
  );
  heading.append(copy);
  page.append(heading);

  const context = ui.createElement('section', { className: 'card application-context' });
  context.append(ui.createElement('span', { className: 'eyebrow', text: 'YOUR SELECTED ROLE' }));
  context.append(ui.createElement('h2', { text: role.roleTitle }));
  context.append(ui.createElement('p', { text: opportunity.title }));
  context.append(
    ui.createElement('p', {
      className: 'application-context-owner',
      text: `Posted by ${owner?.displayName || 'Unknown student'}`,
    }),
  );
  if (role.skills)
    context.append(
      ui.createElement('p', {
        className: 'application-context-skills',
        text: `Helpful skills: ${role.skills}`,
      }),
    );
  page.append(context);

  const form = ui.createElement('form', {
    className: 'card project-form-card application-form-card',
    attrs: { novalidate: true },
  });
  const intro = ui.createElement('div', { className: 'project-form-intro' });
  intro.append(ui.createElement('h2', { text: 'Your application' }));
  intro.append(
    ui.createElement('p', {
      text: 'The project owner will review your application before adding you to the team.',
    }),
  );
  form.append(intro);
  const fields = ui.createElement('div', { className: 'project-form-fields' });
  const pitch = createField({
    label: 'Why are you interested in this role?',
    name: 'pitch',
    type: 'textarea',
    placeholder: 'Explain what interests you about this project and role…',
    required: true,
    maxLength: 1000,
    rows: 5,
    hint: 'At least 20 characters. Maximum 1,000 characters.',
  });
  const skills = createField({
    label: 'Relevant skills or experience',
    name: 'skills',
    type: 'textarea',
    placeholder: 'What skills or experience would you bring?',
    required: true,
    maxLength: 1000,
    rows: 3,
    hint: 'You can include beginner-level experience. At least 5 characters.',
  });
  const learningGoals = createField({
    label: 'What would you like to learn?',
    name: 'learningGoals',
    type: 'textarea',
    placeholder: 'Optional: describe what you hope to learn…',
    maxLength: 500,
    rows: 3,
  });
  fields.append(pitch.group, skills.group, learningGoals.group);
  form.append(fields);

  const footer = ui.createElement('div', { className: 'project-form-actions' });
  footer.append(
    ui.createButton({
      text: 'Cancel',
      variant: 'quiet',
      onClick: () => router.navigate(`/projects/${encodeURIComponent(opportunityId)}`),
    }),
  );
  footer.append(
    ui.createButton({ text: 'Submit application', variant: 'primary', type: 'submit' }),
  );
  form.append(footer);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const validationResult = validation.validateForm(data, {
      pitch: [
        (value) => validators.required(value, 'Your pitch'),
        (value) => validators.minLength(value, 20, 'Your pitch'),
        (value) => validators.maxLength(value, 1000, 'Your pitch'),
      ],
      skills: [
        (value) => validators.required(value, 'Relevant skills'),
        (value) => validators.minLength(value, 5, 'Relevant skills'),
        (value) => validators.maxLength(value, 1000, 'Relevant skills'),
      ],
      learningGoals: [(value) => validators.maxLength(value, 500, 'Learning goals')],
    });
    validation.showFormErrors(form, validationResult.errors);
    if (!validationResult.valid) {
      ui.showToast('Please correct the highlighted fields.', 'error');
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    try {
      const result = projectService.submitApplication({
        opportunityId,
        roleId,
        applicantId,
        pitch: data.pitch,
        skills: data.skills,
        learningGoals: data.learningGoals,
      });
      if (!result.ok) {
        const messages = {
          duplicate: 'You have already applied to this role.',
          closed: 'This opportunity is no longer accepting applications.',
          'owner-cannot-apply': 'You cannot apply to your own opportunity.',
        };
        ui.showToast(
          messages[result.reason] || `Application could not be submitted (${result.reason}).`,
          'error',
        );
        return;
      }
      ui.showToast('Application submitted. The owner can now review it.', 'success');
      router.navigate(`/projects/${encodeURIComponent(opportunityId)}`);
    } catch (error) {
      ui.showToast(error.message || 'Could not submit the application.', 'error');
    }
  });

  page.append(form);
  container.replaceChildren(page);
  pitch.field.focus();
}
