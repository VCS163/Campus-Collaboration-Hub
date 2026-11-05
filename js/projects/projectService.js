import { storage } from '../shared/storage.js';

export const PROJECT_CATEGORIES = Object.freeze([
  'Hackathon',
  'Research',
  'Open Source',
  'Startup',
  'Campus Initiative',
  'Side Project',
  'Project',
]);

export const OPPORTUNITY_STATUSES = Object.freeze(['open', 'active', 'completed', 'archived']);

function result(ok, reason = null, extra = {}) {
  return { ok, reason, ...extra };
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getOpportunityRoles(opportunityId) {
  return storage.query('projectRoles', (role) => role.opportunityId === opportunityId);
}

function getOpportunityApplications(opportunityId) {
  return storage.query('applications', (application) => application.opportunityId === opportunityId);
}

function getAcceptedTeam(opportunityId) {
  return getOpportunityApplications(opportunityId)
    .filter((application) => application.status === 'accepted')
    .map((application) => {
      const student = storage.getById('students', application.applicantId);
      const role = storage.getById('projectRoles', application.roleId);
      return student ? { ...student, applicationId: application.id, roleTitle: role?.roleTitle || 'Contributor' } : null;
    })
    .filter(Boolean);
}

function createOpportunity(ownerId, details, roles) {
  const owner = storage.getById('students', ownerId);
  if (!owner) return result(false, 'invalid-owner');
  if (!details || !isNonEmptyString(details.title) || details.title.trim().length < 5 || details.title.trim().length > 100) {
    return result(false, 'invalid-title');
  }
  if (!isNonEmptyString(details.description) || details.description.trim().length < 10 || details.description.trim().length > 2000) {
    return result(false, 'invalid-description');
  }
  if (!PROJECT_CATEGORIES.includes(details.category)) return result(false, 'invalid-category');
  if (!Array.isArray(roles) || roles.length < 1 || roles.length > 5) return result(false, 'invalid-roles');

  const normalisedRoles = roles.map((role) => ({
    roleTitle: String(role?.roleTitle ?? '').trim(),
    description: String(role?.description ?? '').trim(),
    skills: String(role?.skills ?? '').trim(),
  }));
  const invalidRole = normalisedRoles.some((role) =>
    role.roleTitle.length < 3 || role.roleTitle.length > 80 || role.description.length < 10 || role.description.length > 1000,
  );
  if (invalidRole) return result(false, 'invalid-role');

  let opportunity = null;
  const insertedRoles = [];
  try {
    opportunity = storage.insert('opportunities', {
      title: details.title.trim(),
      description: details.description.trim(),
      category: details.category,
      beginnerFriendly: Boolean(details.beginnerFriendly),
      ownerId,
      status: 'open',
    });

    for (const role of normalisedRoles) {
      insertedRoles.push(storage.insert('projectRoles', { ...role, opportunityId: opportunity.id }));
    }
  } catch (error) {
    // Keep the operation consistent if a storage write fails part-way through.
    insertedRoles.forEach((role) => storage.remove('projectRoles', role.id));
    if (opportunity) storage.remove('opportunities', opportunity.id);
    throw error;
  }

  return result(true, null, { opportunity, roles: insertedRoles });
}

function submitApplication({ opportunityId, roleId, applicantId, pitch, skills, learningGoals = '' }) {
  const opportunity = storage.getById('opportunities', opportunityId);
  const role = storage.getById('projectRoles', roleId);
  const applicant = storage.getById('students', applicantId);

  if (!opportunity) return result(false, 'opportunity-not-found');
  if (!role || role.opportunityId !== opportunityId) return result(false, 'role-not-found');
  if (!applicant) return result(false, 'invalid-applicant');
  if (opportunity.ownerId === applicantId) return result(false, 'owner-cannot-apply');
  if (!['open', 'active'].includes(opportunity.status)) return result(false, 'closed');

  const duplicate = storage.query('applications', (application) =>
    application.roleId === roleId && application.applicantId === applicantId,
  )[0];
  if (duplicate) return result(false, 'duplicate', { application: duplicate });

  const cleanPitch = String(pitch ?? '').trim();
  const cleanSkills = String(skills ?? '').trim();
  const cleanLearningGoals = String(learningGoals ?? '').trim();
  if (cleanPitch.length < 20 || cleanPitch.length > 1000) return result(false, 'invalid-pitch');
  if (cleanSkills.length < 5 || cleanSkills.length > 1000) return result(false, 'invalid-skills');
  if (cleanLearningGoals.length > 500) return result(false, 'invalid-learning-goals');

  const application = storage.insert('applications', {
    opportunityId,
    roleId,
    applicantId,
    pitch: cleanPitch,
    skills: cleanSkills,
    learningGoals: cleanLearningGoals,
    status: 'pending',
  });
  return result(true, null, { application });
}

function reviewApplication({ opportunityId, applicationId, reviewerId, decision }) {
  const opportunity = storage.getById('opportunities', opportunityId);
  if (!opportunity) return result(false, 'opportunity-not-found');
  if (opportunity.ownerId !== reviewerId) return result(false, 'forbidden');
  if (!['open', 'active'].includes(opportunity.status)) return result(false, 'closed');
  if (!['accepted', 'rejected'].includes(decision)) return result(false, 'invalid-decision');

  const application = storage.getById('applications', applicationId);
  if (!application || application.opportunityId !== opportunityId) return result(false, 'application-not-found');
  if (application.status !== 'pending') return result(false, 'already-reviewed', { application });
  if (application.applicantId === reviewerId) return result(false, 'self-review');

  const updatedApplication = storage.update('applications', applicationId, { status: decision });
  let updatedOpportunity = opportunity;
  if (decision === 'accepted' && opportunity.status === 'open') {
    updatedOpportunity = storage.update('opportunities', opportunityId, { status: 'active' });
  }
  return result(true, null, { application: updatedApplication, opportunity: updatedOpportunity });
}

function transitionOpportunity({ opportunityId, actorId, nextStatus }) {
  const opportunity = storage.getById('opportunities', opportunityId);
  if (!opportunity) return result(false, 'not-found');
  if (opportunity.ownerId !== actorId) return result(false, 'forbidden');

  const allowedTransitions = {
    active: ['completed'],
    completed: ['archived'],
  };
  if (!allowedTransitions[opportunity.status]?.includes(nextStatus)) {
    return result(false, 'invalid-transition', { opportunity });
  }

  const updated = storage.update('opportunities', opportunityId, { status: nextStatus });
  return result(true, null, { opportunity: updated });
}

export const projectService = Object.freeze({
  getOpportunityRoles,
  getOpportunityApplications,
  getAcceptedTeam,
  createOpportunity,
  submitApplication,
  reviewApplication,
  transitionOpportunity,
});
