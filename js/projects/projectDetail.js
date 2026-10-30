import { router } from '../router.js';
import { auth } from '../shared/auth.js';
import { storage } from '../shared/storage.js';
import { ui } from '../shared/ui.js';
import { projectService } from './projectService.js';

const STATUS_LABELS = {
  open: 'Open for applications',
  active: 'Active project',
  completed: 'Completed',
  archived: 'Archived',
};

function statusVariant(status) {
  if (status === 'open' || status === 'active') return 'success';
  if (status === 'completed') return 'warning';
  if (status === 'rejected') return 'danger';
  if (status === 'accepted') return 'success';
  if (status === 'pending') return 'warning';
  return 'neutral';
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function createInfo(label, value) {
  const block = ui.createElement('div', { className: 'project-info-block' });
  block.append(ui.createElement('span', { className: 'project-detail-label', text: label }));
  block.append(ui.createElement('p', { text: value || 'Not provided' }));
  return block;
}

function createPersonRow(student, detail, badgeText = '') {
  const row = ui.createElement('li', { className: 'project-person-row' });
  const initials = String(student.displayName || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  row.append(
    ui.createElement('span', {
      className: 'project-person-avatar',
      text: initials,
      attrs: { 'aria-hidden': 'true' },
    }),
  );
  const identity = ui.createElement('div', { className: 'project-person-identity' });
  identity.append(ui.createElement('strong', { text: student.displayName }));
  identity.append(ui.createElement('span', { text: detail }));
  row.append(identity);
  if (badgeText) row.append(ui.createBadge(badgeText, 'primary'));
  return row;
}

function renderRoleCard(role, opportunity, currentUserId, applications) {
  const card = ui.createElement('article', { className: 'project-role-card' });
  const top = ui.createElement('div', { className: 'project-role-card-top' });
  top.append(ui.createElement('h3', { text: role.roleTitle }));
  const accepted = applications.filter(
    (application) => application.roleId === role.id && application.status === 'accepted',
  ).length;
  top.append(ui.createBadge(`${accepted} accepted`, 'neutral'));
  card.append(top);
  card.append(
    ui.createElement('p', { className: 'project-role-description', text: role.description }),
  );
  if (role.skills)
    card.append(
      ui.createElement('p', {
        className: 'project-role-skills',
        text: `Helpful skills: ${role.skills}`,
      }),
    );

  const existing = applications.find(
    (application) => application.roleId === role.id && application.applicantId === currentUserId,
  );
  const actions = ui.createElement('div', { className: 'project-role-actions' });
  if (opportunity.ownerId === currentUserId) {
    actions.append(ui.createBadge('Your role', 'primary'));
  } else if (!['open', 'active'].includes(opportunity.status)) {
    actions.append(ui.createBadge('Applications closed', 'neutral'));
  } else if (existing) {
    actions.append(
      ui.createBadge(`Application ${existing.status}`, statusVariant(existing.status)),
    );
  } else {
    actions.append(
      ui.createButton({
        text: 'Apply for this role',
        variant: 'primary',
        onClick: () =>
          router.navigate(
            `/projects/${encodeURIComponent(opportunity.id)}/apply/${encodeURIComponent(role.id)}`,
          ),
      }),
    );
  }
  card.append(actions);
  return card;
}

function renderApplicationCard(application, opportunityId) {
  const applicant = storage.getById('students', application.applicantId);
  const role = storage.getById('projectRoles', application.roleId);
  const card = ui.createElement('article', { className: 'project-application-card' });
  const header = ui.createElement('div', { className: 'project-application-card-header' });
  const identity = ui.createElement('div');
  identity.append(ui.createElement('h3', { text: applicant?.displayName || 'Unknown student' }));
  identity.append(
    ui.createElement('p', {
      text: `${role?.roleTitle || 'Contributor role'} · Applied ${formatDate(application.createdAt)}`,
    }),
  );
  header.append(identity, ui.createBadge(application.status, statusVariant(application.status)));
  card.append(header);
  card.append(createInfo('WHY THEY WANT TO CONTRIBUTE', application.pitch));
  card.append(createInfo('RELEVANT SKILLS', application.skills));
  if (application.learningGoals)
    card.append(createInfo('WHAT THEY WANT TO LEARN', application.learningGoals));
  return card;
}

function handleReview(opportunityId, applicationId, decision) {
  const result = projectService.reviewApplication({
    opportunityId,
    applicationId,
    reviewerId: auth.getCurrentUserId(),
    decision,
  });
  if (!result.ok) {
    const messages = {
      forbidden: 'Only the opportunity owner can review applications.',
      'already-reviewed': 'This application has already been reviewed.',
      closed: 'This opportunity is no longer accepting applications.',
    };
    ui.showToast(
      messages[result.reason] || `Could not review application (${result.reason}).`,
      'error',
    );
    return;
  }
  ui.showToast(
    decision === 'accepted'
      ? 'Application accepted. The contributor joined the team.'
      : 'Application rejected.',
    'success',
  );
  renderProjectDetail(opportunityId);
}

function renderPendingApplication(application, opportunityId, canReview) {
  const card = renderApplicationCard(application, opportunityId);
  if (canReview) {
    const actions = ui.createElement('div', { className: 'project-application-actions' });
    actions.append(
      ui.createButton({
        text: 'Reject',
        variant: 'danger',
        className: 'btn-small',
        onClick: () => handleReview(opportunityId, application.id, 'rejected'),
      }),
    );
    actions.append(
      ui.createButton({
        text: 'Accept application',
        variant: 'primary',
        className: 'btn-small',
        onClick: () => handleReview(opportunityId, application.id, 'accepted'),
      }),
    );
    card.append(actions);
  } else {
    card.append(
      ui.createElement('p', {
        className: 'project-application-closed-note',
        text: 'Review is closed because this opportunity is no longer accepting applications.',
      }),
    );
  }
  return card;
}

function handleTransition(opportunityId, nextStatus) {
  const result = projectService.transitionOpportunity({
    opportunityId,
    actorId: auth.getCurrentUserId(),
    nextStatus,
  });
  if (!result.ok) {
    ui.showToast(
      result.reason === 'forbidden'
        ? 'Only the owner can change this project status.'
        : 'That status change is not allowed.',
      'error',
    );
    return;
  }
  ui.showToast(
    nextStatus === 'completed' ? 'Project marked as completed.' : 'Project archived.',
    'success',
  );
  renderProjectDetail(opportunityId);
}

export function renderProjectDetail(opportunityId) {
  const container = document.querySelector('#app-content');
  const opportunity = storage.getById('opportunities', opportunityId);
  const page = ui.createElement('div', { className: 'page-stack project-detail-page' });
  page.append(
    ui.createElement('a', {
      className: 'back-link',
      text: '← Back to opportunities',
      attrs: { href: '#/projects' },
    }),
  );

  if (!opportunity) {
    ui.showEmpty(page, 'This opportunity may have been removed or the link may be incorrect.');
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

  const currentUserId = auth.getCurrentUserId();
  const isOwner = opportunity.ownerId === currentUserId;
  const owner = storage.getById('students', opportunity.ownerId);
  const roles = projectService.getOpportunityRoles(opportunity.id);
  const applications = projectService.getOpportunityApplications(opportunity.id);
  const pendingApplications = applications.filter(
    (application) => application.status === 'pending',
  );
  const team = projectService.getAcceptedTeam(opportunity.id);
  const isArchived = opportunity.status === 'archived';

  if (isArchived || opportunity.status === 'completed') {
    const banner = ui.createElement('section', { className: 'project-archived-banner' });
    banner.append(
      ui.createElement('span', {
        className: 'project-archived-mark',
        text: '✓',
        attrs: { 'aria-hidden': 'true' },
      }),
    );
    banner.append(
      ui.createElement('div', {
        text: isArchived
          ? 'This opportunity has been archived. The details and team remain available as a read-only record.'
          : 'This project is complete and is no longer accepting applications. The owner can archive the record.',
      }),
    );
    page.append(banner);
  }

  const hero = ui.createElement('section', { className: 'project-detail-hero' });
  const badges = ui.createElement('div', { className: 'tag-list' });
  badges.append(ui.createBadge(opportunity.category, 'primary'));
  badges.append(
    ui.createBadge(
      STATUS_LABELS[opportunity.status] || opportunity.status,
      statusVariant(opportunity.status),
    ),
  );
  if (opportunity.beginnerFriendly) badges.append(ui.createBadge('Beginner friendly', 'success'));
  if (isOwner) badges.append(ui.createBadge('You own this project', 'primary'));
  hero.append(badges);
  hero.append(ui.createElement('h1', { text: opportunity.title }));
  hero.append(
    ui.createElement('p', {
      className: 'project-detail-description',
      text: opportunity.description,
    }),
  );
  const meta = ui.createElement('div', { className: 'project-detail-meta' });
  meta.append(ui.createElement('span', { text: `Posted ${formatDate(opportunity.createdAt)}` }));
  meta.append(ui.createElement('span', { text: `By ${owner?.displayName || 'Unknown student'}` }));
  meta.append(
    ui.createElement('span', { text: `${roles.length} ${roles.length === 1 ? 'role' : 'roles'}` }),
  );
  meta.append(
    ui.createElement('span', {
      text: `${team.length} accepted ${team.length === 1 ? 'contributor' : 'contributors'}`,
    }),
  );
  hero.append(meta);
  page.append(hero);

  const content = ui.createElement('div', { className: 'project-detail-content' });
  const mainColumn = ui.createElement('div', { className: 'project-detail-main' });
  const overview = ui.createElement('section', { className: 'card project-detail-card' });
  overview.append(ui.createElement('h2', { text: 'About this opportunity' }));
  overview.append(createInfo('PROJECT DESCRIPTION', opportunity.description));
  overview.append(createInfo('PROJECT OWNER', owner?.displayName || 'Unknown student'));
  overview.append(createInfo('CATEGORY', opportunity.category));
  mainColumn.append(overview);

  const rolesSection = ui.createElement('section', { className: 'card project-detail-card' });
  const rolesHeader = ui.createElement('div', { className: 'project-section-heading' });
  rolesHeader.append(
    ui.createElement('div', {
      children: [
        ui.createElement('h2', { text: 'Contributor roles' }),
        ui.createElement('p', { text: 'Apply to the specific role where you can contribute.' }),
      ],
    }),
  );
  rolesHeader.append(ui.createBadge(String(roles.length), 'primary'));
  rolesSection.append(rolesHeader);
  if (roles.length) {
    const roleList = ui.createElement('div', { className: 'project-role-list' });
    roles.forEach((role) =>
      roleList.append(renderRoleCard(role, opportunity, currentUserId, applications)),
    );
    rolesSection.append(roleList);
  } else {
    ui.showEmpty(
      rolesSection,
      'No contributor roles have been added yet. The owner can add a role when updating the opportunity.',
    );
  }
  mainColumn.append(rolesSection);

  const teamSection = ui.createElement('section', { className: 'card project-detail-card' });
  const teamHeader = ui.createElement('div', { className: 'project-section-heading' });
  teamHeader.append(
    ui.createElement('div', {
      children: [
        ui.createElement('h2', { text: 'Project team' }),
        ui.createElement('p', { text: 'Students with accepted applications.' }),
      ],
    }),
  );
  teamHeader.append(ui.createBadge(String(team.length), 'success'));
  teamSection.append(teamHeader);
  if (team.length) {
    const list = ui.createElement('ul', { className: 'project-person-list' });
    team.forEach((student) => list.append(createPersonRow(student, student.roleTitle, 'Accepted')));
    teamSection.append(list);
  } else {
    ui.showEmpty(
      teamSection,
      'No contributors have joined this project yet. Accepted applications will appear here.',
    );
  }
  mainColumn.append(teamSection);
  content.append(mainColumn);

  const sideColumn = ui.createElement('aside', { className: 'project-detail-sidebar' });
  if (isOwner) {
    const applicationSection = ui.createElement('section', {
      className: 'card project-detail-card',
    });
    const applicationHeader = ui.createElement('div', { className: 'project-section-heading' });
    applicationHeader.append(
      ui.createElement('div', {
        children: [
          ui.createElement('h2', { text: 'Applications' }),
          ui.createElement('p', { text: 'Review each student before accepting them.' }),
        ],
      }),
    );
    applicationHeader.append(
      ui.createBadge(
        String(pendingApplications.length),
        pendingApplications.length ? 'warning' : 'neutral',
      ),
    );
    applicationSection.append(applicationHeader);
    if (pendingApplications.length) {
      const pendingList = ui.createElement('div', { className: 'project-application-list' });
      pendingApplications.forEach((application) =>
        pendingList.append(
          renderPendingApplication(
            application,
            opportunity.id,
            ['open', 'active'].includes(opportunity.status),
          ),
        ),
      );
      applicationSection.append(pendingList);
    } else {
      ui.showEmpty(
        applicationSection,
        'There are no pending applications right now. New applications will appear here.',
      );
    }
    const reviewedApplications = applications.filter(
      (application) => application.status !== 'pending',
    );
    if (reviewedApplications.length) {
      const reviewed = ui.createElement('details', { className: 'project-reviewed-applications' });
      reviewed.append(
        ui.createElement('summary', {
          text: `Reviewed applications (${reviewedApplications.length})`,
        }),
      );
      const reviewedList = ui.createElement('div', { className: 'project-application-list' });
      reviewedApplications.forEach((application) =>
        reviewedList.append(renderApplicationCard(application, opportunity.id)),
      );
      reviewed.append(reviewedList);
      applicationSection.append(reviewed);
    }
    sideColumn.append(applicationSection);
  } else {
    const yourStatus = ui.createElement('section', {
      className: 'card project-detail-card project-your-status',
    });
    yourStatus.append(ui.createElement('h2', { text: 'Your application status' }));
    const ownApplications = applications.filter(
      (application) => application.applicantId === currentUserId,
    );
    if (ownApplications.length) {
      ownApplications.forEach((application) => {
        const role = storage.getById('projectRoles', application.roleId);
        const row = ui.createElement('div', { className: 'project-own-application' });
        row.append(ui.createElement('strong', { text: role?.roleTitle || 'Contributor role' }));
        row.append(ui.createBadge(application.status, statusVariant(application.status)));
        yourStatus.append(row);
      });
    } else {
      yourStatus.append(
        ui.createElement('p', {
          text: 'You have not applied to any role in this opportunity yet.',
        }),
      );
    }
    sideColumn.append(yourStatus);
  }

  const lifecycle = ui.createElement('section', {
    className: 'card project-detail-card project-lifecycle-card',
  });
  lifecycle.append(
    ui.createElement('h2', { text: isOwner ? 'Manage opportunity' : 'About project status' }),
  );
  if (isOwner && opportunity.status === 'active') {
    lifecycle.append(
      ui.createElement('p', {
        text: 'When the project work is finished, mark it completed. You can archive it afterwards.',
      }),
    );
    lifecycle.append(
      ui.createButton({
        text: 'Mark as completed',
        variant: 'secondary',
        onClick: () => {
          if (window.confirm('Mark this project as completed? New applications will stop.'))
            handleTransition(opportunity.id, 'completed');
        },
      }),
    );
  } else if (isOwner && opportunity.status === 'completed') {
    lifecycle.append(
      ui.createElement('p', {
        text: 'This project is complete. Archive it to make the record read-only.',
      }),
    );
    lifecycle.append(
      ui.createButton({
        text: 'Archive opportunity',
        variant: 'danger',
        onClick: () => {
          if (window.confirm('Archive this opportunity? It will become read-only.'))
            handleTransition(opportunity.id, 'archived');
        },
      }),
    );
  } else if (isArchived) {
    lifecycle.append(
      ui.createElement('p', { text: 'This opportunity is archived and read-only.' }),
    );
  } else {
    lifecycle.append(
      ui.createElement('p', {
        text: 'The owner manages the project lifecycle. Applications are accepted only while the opportunity is open or active.',
      }),
    );
  }
  sideColumn.append(lifecycle);
  content.append(sideColumn);
  page.append(content);

  container.replaceChildren(page);
}
