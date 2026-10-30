import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { storage } from '../shared/storage.js';
import { ui } from '../shared/ui.js';
import { clubService } from './clubService.js';

function getClubMembers(club) {
  return clubService.getClubMembers(club.id);
}

function formatDate(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function createInfo(label, value) {
  const block = ui.createElement('div', { className: 'club-info-block' });
  block.append(ui.createElement('span', { className: 'club-detail-label', text: label }));
  block.append(ui.createElement('p', { text: value || 'Not provided' }));
  return block;
}

function renderNotFound() {
  const page = ui.createElement('div', { className: 'page-stack' });
  page.append(
    ui.createElement('a', {
      className: 'back-link',
      text: '← Back to clubs',
      attrs: { href: '#/clubs' },
    }),
  );
  ui.showEmpty(
    page,
    'This club may have been removed or the link may be incorrect.',
    'Browse clubs',
    '#/clubs',
  );
  document.querySelector('#app-content').replaceChildren(page);
}

function renderMember(member) {
  const row = ui.createElement('li', { className: 'club-member-row' });
  const initials = member.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  row.append(
    ui.createElement('span', {
      className: 'club-member-avatar',
      text: initials,
      attrs: { 'aria-hidden': 'true' },
    }),
  );
  const identity = ui.createElement('div', { className: 'club-member-identity' });
  identity.append(ui.createElement('strong', { text: member.displayName }));
  identity.append(ui.createElement('span', { text: `${member.branch} · Year ${member.year}` }));
  row.append(identity);
  row.append(
    ui.createBadge(
      member.membershipRole,
      member.membershipRole === 'Organiser' ? 'primary' : 'neutral',
    ),
  );
  return row;
}

function handleJoin(clubId) {
  const result = clubService.joinClub(clubId, auth.getCurrentUserId());
  if (!result.ok) {
    ui.showToast(
      result.message,
      result.reason === 'duplicate' || result.reason === 'organiser' ? 'info' : 'error',
    );
    if (['not-found', 'archived', 'duplicate', 'organiser'].includes(result.reason))
      router.dispatch();
    return;
  }

  ui.showToast(result.message, 'success');
  router.dispatch();
}

function handleArchive(clubId) {
  const club = storage.getById('clubs', clubId);
  if (!club) {
    ui.showToast('This club could not be found.', 'error');
    router.navigate('/clubs');
    return;
  }

  const currentUserId = auth.getCurrentUserId();
  if (club.organiserId !== currentUserId) {
    ui.showToast('Only the organiser can archive this club.', 'error');
    router.dispatch();
    return;
  }
  if (club.status !== 'active') {
    ui.showToast('This club is already archived.', 'info');
    router.dispatch();
    return;
  }

  const confirmed = window.confirm(
    `Archive “${club.title}”? Members will remain visible, but nobody will be able to join. This action cannot be undone in the MVP.`,
  );
  if (!confirmed) return;

  try {
    const result = clubService.archiveClub(clubId, currentUserId);
    if (!result.ok) {
      ui.showToast(result.message, 'error');
      router.dispatch();
      return;
    }
    ui.showToast(result.message, 'success');
    router.dispatch();
  } catch (error) {
    ui.showToast(error.message || 'Could not archive this club.', 'error');
  }
}

export function renderClubDetail(clubId) {
  const club = storage.getById('clubs', clubId);
  if (!club) {
    renderNotFound();
    return;
  }

  const currentUserId = auth.getCurrentUserId();
  const isOrganiser = club.organiserId === currentUserId;
  const isArchived = club.status === 'archived';
  const organiser = storage.getById('students', club.organiserId);
  const members = getClubMembers(club);
  const currentMembership = storage.query(
    'clubMemberships',
    (membership) => membership.clubId === club.id && membership.studentId === currentUserId,
  )[0];
  const isMember = isOrganiser || Boolean(currentMembership);

  const page = ui.createElement('div', { className: 'page-stack club-detail-page' });
  page.append(
    ui.createElement('a', {
      className: 'back-link',
      text: '← Back to clubs',
      attrs: { href: '#/clubs' },
    }),
  );

  if (isArchived) {
    const archivedBanner = ui.createElement('section', {
      className: 'notice club-archived-banner',
      attrs: { role: 'status' },
    });
    archivedBanner.append(
      ui.createElement('span', {
        className: 'notice-mark',
        text: '✓',
        attrs: { 'aria-hidden': 'true' },
      }),
    );
    const bannerCopy = ui.createElement('div');
    bannerCopy.append(ui.createElement('strong', { text: 'This club has ended.' }));
    bannerCopy.append(
      ui.createElement('p', {
        text: 'This group is archived and read-only. Its purpose and member history remain available, but new members cannot join.',
      }),
    );
    archivedBanner.append(bannerCopy);
    page.append(archivedBanner);
  }

  const hero = ui.createElement('section', { className: 'card club-detail-hero' });
  const badges = ui.createElement('div', { className: 'club-card-top' });
  badges.append(ui.createBadge(club.category, 'primary'));
  badges.append(
    ui.createBadge(isArchived ? 'Archived' : 'Active', isArchived ? 'neutral' : 'success'),
  );
  hero.append(badges);
  hero.append(ui.createElement('h1', { text: club.title }));
  hero.append(
    ui.createElement('p', { className: 'club-detail-description', text: club.description }),
  );
  const meta = ui.createElement('div', { className: 'club-detail-meta' });
  meta.append(ui.createElement('span', { text: `◷ ${club.duration}` }));
  meta.append(
    ui.createElement('span', {
      text: `♙ ${members.length} ${members.length === 1 ? 'member' : 'members'}`,
    }),
  );
  meta.append(ui.createElement('span', { text: `Created ${formatDate(club.createdAt)}` }));
  hero.append(meta);
  page.append(hero);

  const layout = ui.createElement('div', { className: 'club-detail-layout' });
  const overview = ui.createElement('section', { className: 'card club-overview-card' });
  overview.append(
    ui.createElement('div', { className: 'club-section-heading', text: 'Why this group exists' }),
  );
  overview.append(createInfo('GROUP GOAL', club.goal));
  overview.append(createInfo('DESCRIPTION', club.description));
  overview.append(createInfo('INTENDED DURATION', club.duration));
  overview.append(createInfo('ORGANISED BY', organiser?.displayName || 'Unknown student'));
  layout.append(overview);

  const membersCard = ui.createElement('section', { className: 'card club-members-card' });
  const membersHeader = ui.createElement('div', { className: 'club-members-heading' });
  const membersTitle = ui.createElement('div');
  membersTitle.append(ui.createElement('h2', { text: 'People in this group' }));
  membersTitle.append(ui.createElement('p', { text: 'The organiser is included as a member.' }));
  membersHeader.append(membersTitle);
  membersHeader.append(ui.createBadge(String(members.length), 'primary'));
  membersCard.append(membersHeader);

  const memberList = ui.createElement('ul', { className: 'club-member-list' });
  members.forEach((member) => memberList.append(renderMember(member)));
  if (members.length === 0) {
    membersCard.append(
      ui.createElement('p', {
        className: 'club-member-empty',
        text: 'Member profiles are not available.',
      }),
    );
  } else {
    membersCard.append(memberList);
  }
  layout.append(membersCard);
  page.append(layout);

  const actionPanel = ui.createElement('section', { className: 'card club-action-panel' });
  const actionCopy = ui.createElement('div');
  actionCopy.append(ui.createElement('h2', { text: 'Your participation' }));
  let actionMessage = 'Join this group if its purpose and duration fit your interests.';
  if (isArchived)
    actionMessage = 'This group has ended. You can still view its purpose and members.';
  else if (isOrganiser)
    actionMessage = 'You organise this group. You are included in the member list automatically.';
  else if (isMember) actionMessage = 'You are a member of this group.';
  actionCopy.append(ui.createElement('p', { text: actionMessage }));
  actionPanel.append(actionCopy);

  const actions = ui.createElement('div', { className: 'club-detail-actions' });
  if (!isArchived && isOrganiser) {
    actions.append(
      ui.createButton({
        text: 'Archive club',
        variant: 'danger',
        onClick: () => handleArchive(club.id),
      }),
    );
  } else if (!isArchived && isMember) {
    actions.append(ui.createBadge('You are a member', 'success'));
  } else if (!isArchived) {
    actions.append(
      ui.createButton({
        text: 'Join this club',
        variant: 'primary',
        onClick: () => handleJoin(club.id),
      }),
    );
  } else {
    actions.append(ui.createBadge('Read-only archive', 'neutral'));
  }
  actionPanel.append(actions);
  page.append(actionPanel);

  document.querySelector('#app-content').replaceChildren(page);
}
