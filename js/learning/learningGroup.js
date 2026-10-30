import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { storage } from '../shared/storage.js';
import { ui } from '../shared/ui.js';
import { validation, validators } from '../shared/validation.js';
import { learningService } from './learningService.js';

function renderParticipant(student) {
  const row = ui.createElement('article', { className: 'learning-participant' });
  const initials = student.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  row.append(
    ui.createElement('span', {
      className: 'learning-participant-avatar',
      text: initials,
      attrs: { 'aria-hidden': 'true' },
    }),
  );
  const copy = ui.createElement('div', { className: 'learning-participant-copy' });
  copy.append(ui.createElement('strong', { text: student.displayName }));
  copy.append(ui.createElement('span', { text: `Year ${student.year} · ${student.branch}` }));
  row.append(copy);
  row.append(
    ui.createBadge(student.groupRole, student.groupRole === 'Mentor' ? 'primary' : 'neutral'),
  );
  return row;
}

function renderMilestone(milestone, group, currentUserId) {
  const row = ui.createElement('label', {
    className: `learning-milestone${milestone.completed ? ' is-completed' : ''}`,
  });
  const checkbox = ui.createElement('input', {
    attrs: {
      type: 'checkbox',
      checked: milestone.completed ? true : null,
      disabled: group.status !== 'active' ? true : null,
    },
  });
  const title = ui.createElement('span', {
    className: 'learning-milestone-title',
    text: milestone.title,
  });
  row.append(
    checkbox,
    title,
    ui.createBadge(
      milestone.completed ? 'Complete' : 'To do',
      milestone.completed ? 'success' : 'neutral',
    ),
  );
  checkbox.addEventListener('change', () => {
    const result = learningService.toggleLearningMilestone({
      groupId: group.id,
      milestoneId: milestone.id,
      actorId: currentUserId,
    });
    if (result.ok) {
      ui.showToast(
        result.milestone.completed ? 'Milestone completed.' : 'Milestone marked as not done.',
        'success',
      );
      router.dispatch();
    } else {
      ui.showToast(`Could not update milestone (${result.reason}).`, 'error');
      router.dispatch();
    }
  });
  return row;
}

export function renderLearningGroup(groupId) {
  const group = storage.getById('learningGroups', groupId);
  const currentUserId = auth.getCurrentUserId();
  const page = ui.createElement('div', { className: 'page-stack learning-group-page' });
  page.append(
    ui.createElement('a', {
      className: 'back-link',
      text: '← Back to learning',
      attrs: { href: '#/learning' },
    }),
  );

  if (!group) {
    ui.showEmpty(page, 'This learning group could not be found.');
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

  const participants = learningService.getGroupParticipants(group.id);
  const isParticipant =
    group.mentorId === currentUserId || group.learnerIds.includes(currentUserId);
  const isMentor = group.mentorId === currentUserId;
  const milestones = storage
    .query('learningMilestones', (milestone) => milestone.groupId === group.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const completedCount = milestones.filter((milestone) => milestone.completed).length;

  const hero = ui.createElement('section', {
    className: 'learning-detail-hero learning-group-hero',
  });
  const heroCopy = ui.createElement('div', { className: 'learning-detail-hero-copy' });
  heroCopy.append(ui.createElement('div', { className: 'eyebrow', text: 'LEARNING GROUP' }));
  heroCopy.append(ui.createElement('h1', { text: group.topic }));
  heroCopy.append(
    ui.createElement('p', {
      text: 'A shared learning objective with a mentor and participating students.',
    }),
  );
  hero.append(heroCopy);
  hero.append(ui.createBadge(group.status, group.status === 'active' ? 'success' : 'neutral'));
  page.append(hero);

  if (!isParticipant) {
    const warning = ui.createElement('section', { className: 'notice' });
    warning.append(ui.createElement('span', { className: 'notice-mark', text: 'i' }));
    const warningCopy = ui.createElement('div');
    warningCopy.append(ui.createElement('strong', { text: 'This is not your learning group' }));
    warningCopy.append(
      ui.createElement('p', {
        text: 'Only the mentor and accepted learners can view group participants and update milestones in this prototype.',
      }),
    );
    warning.append(warningCopy);
    page.append(warning);
    document.querySelector('#app-content').replaceChildren(page);
    return;
  }

  const summary = ui.createElement('section', { className: 'metric-grid learning-group-metrics' });
  const countCard = ui.createElement('article', { className: 'card metric-card' });
  const countCopy = ui.createElement('div');
  countCopy.append(ui.createElement('span', { className: 'metric-label', text: 'Participants' }));
  countCopy.append(
    ui.createElement('strong', { className: 'metric-value', text: String(participants.length) }),
  );
  countCopy.append(
    ui.createElement('span', { className: 'metric-note', text: 'Mentor and accepted learners' }),
  );
  countCard.append(countCopy);
  summary.append(countCard);
  const progressCard = ui.createElement('article', { className: 'card metric-card' });
  const progressCopy = ui.createElement('div');
  progressCopy.append(
    ui.createElement('span', { className: 'metric-label', text: 'Milestones completed' }),
  );
  progressCopy.append(
    ui.createElement('strong', {
      className: 'metric-value',
      text: `${completedCount} / ${milestones.length}`,
    }),
  );
  progressCopy.append(
    ui.createElement('span', {
      className: 'metric-note',
      text: milestones.length ? 'Progress checklist' : 'No milestones added yet',
    }),
  );
  progressCard.append(progressCopy);
  summary.append(progressCard);
  page.append(summary);

  const layout = ui.createElement('div', {
    className: 'learning-detail-grid learning-group-layout',
  });
  const main = ui.createElement('div', { className: 'page-stack' });
  const milestoneCard = ui.createElement('section', { className: 'card learning-detail-card' });
  const milestoneHeading = ui.createElement('div', { className: 'section-heading' });
  const milestoneHeadingCopy = ui.createElement('div');
  milestoneHeadingCopy.append(ui.createElement('h2', { text: 'Learning milestones' }));
  milestoneHeadingCopy.append(
    ui.createElement('p', {
      text: 'Small checkpoints help everyone see progress. Any group participant can update a milestone.',
    }),
  );
  milestoneHeading.append(milestoneHeadingCopy);
  milestoneCard.append(milestoneHeading);
  const milestoneList = ui.createElement('div', { className: 'learning-milestone-list' });
  if (!milestones.length)
    ui.showEmpty(
      milestoneList,
      'No milestones yet. Add a simple checkpoint for this learning goal.',
    );
  else
    milestones.forEach((milestone) =>
      milestoneList.append(renderMilestone(milestone, group, currentUserId)),
    );
  milestoneCard.append(milestoneList);

  if (group.status === 'active') {
    const addForm = ui.createElement('form', {
      className: 'learning-milestone-form',
      attrs: { novalidate: true },
    });
    const titleGroup = ui.createElement('div', { className: 'form-group learning-form-group' });
    titleGroup.append(
      ui.createElement('label', {
        text: 'Add a milestone',
        attrs: { for: 'learning-milestone-title' },
      }),
    );
    const titleInput = ui.createElement('input', {
      id: 'learning-milestone-title',
      attrs: {
        name: 'title',
        placeholder: 'e.g. Complete the first Python exercise',
        maxlength: 120,
        required: true,
      },
    });
    titleGroup.append(titleInput);
    titleGroup.append(
      ui.createElement('span', {
        className: 'form-hint',
        text: '3–120 characters. Any participant can add a checkpoint.',
      }),
    );
    addForm.append(titleGroup);
    addForm.append(
      ui.createButton({ text: 'Add milestone', variant: 'secondary', type: 'submit' }),
    );
    addForm.addEventListener('submit', (event) => {
      event.preventDefault();
      validation.clearFormErrors(addForm);
      const data = Object.fromEntries(new FormData(addForm).entries());
      const errors = validation.validateForm(data, {
        title: [
          (value) => validators.required(value, 'Milestone title'),
          (value) => validators.minLength(value, 3, 'Milestone title'),
          (value) => validators.maxLength(value, 120, 'Milestone title'),
        ],
      }).errors;
      validation.showFormErrors(addForm, errors);
      if (Object.keys(errors).length) {
        ui.showToast('Enter a milestone title of at least 3 characters.', 'error');
        titleInput.focus();
        return;
      }
      const result = learningService.addLearningMilestone({
        groupId: group.id,
        actorId: currentUserId,
        title: data.title,
      });
      if (result.ok) {
        ui.showToast('Learning milestone added.', 'success');
        router.dispatch();
      } else ui.showToast(`Could not add milestone (${result.reason}).`, 'error');
    });
    milestoneCard.append(addForm);
  }
  main.append(milestoneCard);
  layout.append(main);

  const sidebar = ui.createElement('aside', { className: 'page-stack learning-detail-sidebar' });
  const participantCard = ui.createElement('section', { className: 'card learning-detail-card' });
  participantCard.append(ui.createElement('h2', { text: 'Group participants' }));
  const participantList = ui.createElement('div', { className: 'learning-participant-list' });
  participants.forEach((participant) => participantList.append(renderParticipant(participant)));
  participantCard.append(participantList);
  sidebar.append(participantCard);

  if (isMentor && group.status === 'active') {
    const completeCard = ui.createElement('section', { className: 'card learning-detail-card' });
    completeCard.append(ui.createElement('h2', { text: 'Finish this learning group' }));
    completeCard.append(
      ui.createElement('p', {
        text: 'When the shared learning objective has been reached, mark this group as completed. Its progress remains available as read-only history.',
      }),
    );
    completeCard.append(
      ui.createButton({
        text: 'Mark group completed',
        variant: 'primary',
        className: 'btn-full',
        onClick: () => {
          const confirmed = window.confirm(
            'Mark this learning group as completed? Milestones will become read-only.',
          );
          if (!confirmed) return;
          const result = learningService.completeLearningGroup({
            groupId: group.id,
            actorId: currentUserId,
          });
          if (result.ok) {
            ui.showToast('Learning group marked as completed.', 'success');
            router.dispatch();
          } else ui.showToast(`Could not complete group (${result.reason}).`, 'error');
        },
      }),
    );
    sidebar.append(completeCard);
  }
  layout.append(sidebar);
  page.append(layout);
  document.querySelector('#app-content').replaceChildren(page);
}
