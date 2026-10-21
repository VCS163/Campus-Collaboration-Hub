import test, { before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  #values = new Map();
  get length() { return this.#values.size; }
  key(index) { return [...this.#values.keys()][index] ?? null; }
  getItem(key) { return this.#values.has(String(key)) ? this.#values.get(String(key)) : null; }
  setItem(key, value) { this.#values.set(String(key), String(value)); }
  removeItem(key) { this.#values.delete(String(key)); }
  clear() { this.#values.clear(); }
}

globalThis.localStorage = new MemoryStorage();

let storage;
let seed;
let projectService;

before(async () => {
  ({ storage } = await import('../js/shared/storage.js'));
  ({ seed } = await import('../js/shared/seed.js'));
  ({ projectService } = await import('../js/projects/projectService.js'));
});

beforeEach(() => {
  storage.resetDemoData();
});

test('seed opportunities expose roles, pending applications and accepted team members', () => {
  const campusRoles = projectService.getOpportunityRoles('opportunity_campus_app');
  const campusApplications = projectService.getOpportunityApplications('opportunity_campus_app');
  const mlTeam = projectService.getAcceptedTeam('opportunity_ml_study_tool');

  assert.equal(campusRoles.length, 2);
  assert.equal(campusApplications.filter((item) => item.status === 'pending').length, 1);
  assert.equal(mlTeam.length, 1);
  assert.equal(mlTeam[0].id, 'student_meera_patel');
  assert.equal(mlTeam[0].roleTitle, 'Python Contributor');
});

test('creating an opportunity creates its initial roles with the current owner', () => {
  const result = projectService.createOpportunity('student_ravi_kumar', {
    title: 'Campus Robotics Showcase',
    description: 'Build a small demonstration platform for the campus robotics showcase.',
    category: 'Campus Initiative',
    beginnerFriendly: true,
  }, [
    { roleTitle: 'Embedded Developer', description: 'Implement the microcontroller and sensor integration.', skills: 'C, Embedded C, ESP32' },
    { roleTitle: 'Documentation Writer', description: 'Prepare clear setup notes and demo instructions.', skills: 'Technical writing' },
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.opportunity.ownerId, 'student_ravi_kumar');
  assert.equal(result.opportunity.status, 'open');
  assert.equal(result.roles.length, 2);
  assert.ok(result.roles.every((role) => role.opportunityId === result.opportunity.id));
  assert.equal(storage.getById('opportunities', result.opportunity.id).title, 'Campus Robotics Showcase');
});

test('opportunity creation rejects invalid owner, category, fields and role list', () => {
  const invalidOwner = projectService.createOpportunity('missing-student', {}, []);
  assert.equal(invalidOwner.reason, 'invalid-owner');

  const invalidCategory = projectService.createOpportunity('student_arjun_sharma', {
    title: 'Valid project title', description: 'A sufficiently detailed project description.', category: 'Other',
  }, [{ roleTitle: 'Developer', description: 'A role with enough detail.' }]);
  assert.equal(invalidCategory.reason, 'invalid-category');

  const noRoles = projectService.createOpportunity('student_arjun_sharma', {
    title: 'Valid project title', description: 'A sufficiently detailed project description.', category: 'Project',
  }, []);
  assert.equal(noRoles.reason, 'invalid-roles');

  const invalidRole = projectService.createOpportunity('student_arjun_sharma', {
    title: 'Valid project title', description: 'A sufficiently detailed project description.', category: 'Project',
  }, [{ roleTitle: 'IT', description: 'Too short' }]);
  assert.equal(invalidRole.reason, 'invalid-role');
});

test('applicant can apply once per role and can apply to a different role in same opportunity', () => {
  const first = projectService.submitApplication({
    opportunityId: 'opportunity_campus_app', roleId: 'role_campus_ui', applicantId: 'student_ravi_kumar',
    pitch: 'I want to help improve the student experience and learn how a product team works.',
    skills: 'Figma, HTML, CSS', learningGoals: 'Learn accessible interface design.',
  });
  assert.equal(first.ok, true);
  assert.equal(first.application.status, 'pending');

  const duplicate = projectService.submitApplication({
    opportunityId: 'opportunity_campus_app', roleId: 'role_campus_ui', applicantId: 'student_ravi_kumar',
    pitch: 'I want to help improve the student experience and learn how a product team works.',
    skills: 'Figma, HTML, CSS',
  });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, 'duplicate');

  const differentRole = projectService.submitApplication({
    opportunityId: 'opportunity_campus_app', roleId: 'role_campus_frontend', applicantId: 'student_meera_patel',
    pitch: 'I want to help build a useful student platform and practise frontend development.',
    skills: 'HTML, CSS, JavaScript',
  });
  assert.equal(differentRole.ok, true); // a student may apply to a different role in the same opportunity

  const raviApplications = storage.query('applications', (item) => item.applicantId === 'student_ravi_kumar' && item.opportunityId === 'opportunity_campus_app').length;
  assert.equal(raviApplications, 2);
  assert.equal(storage.query('applications', (item) => item.applicantId === 'student_meera_patel' && item.opportunityId === 'opportunity_campus_app').length, 1);
});

test('application rejects owner, closed opportunity, invalid role relationship and invalid text', () => {
  const ownerAttempt = projectService.submitApplication({
    opportunityId: 'opportunity_campus_app', roleId: 'role_campus_frontend', applicantId: 'student_arjun_sharma',
    pitch: 'I want to contribute to the project and learn from other students.', skills: 'HTML, CSS',
  });
  assert.equal(ownerAttempt.reason, 'owner-cannot-apply');

  const roleMismatch = projectService.submitApplication({
    opportunityId: 'opportunity_campus_app', roleId: 'role_ml_python', applicantId: 'student_meera_patel',
    pitch: 'I want to contribute to the project and learn from other students.', skills: 'Python, SQL',
  });
  assert.equal(roleMismatch.reason, 'role-not-found');

  const shortPitch = projectService.submitApplication({
    opportunityId: 'opportunity_campus_app', roleId: 'role_campus_frontend', applicantId: 'student_meera_patel',
    pitch: 'Interested.', skills: 'HTML, CSS',
  });
  assert.equal(shortPitch.reason, 'invalid-pitch');

  storage.update('opportunities', 'opportunity_campus_app', { status: 'completed' });
  const closed = projectService.submitApplication({
    opportunityId: 'opportunity_campus_app', roleId: 'role_campus_ui', applicantId: 'student_meera_patel',
    pitch: 'I want to contribute to a useful project and practise interface design.', skills: 'Figma and CSS',
  });
  assert.equal(closed.reason, 'closed');
});

test('only owner can accept or reject a pending application; acceptance activates opportunity', () => {
  const denied = projectService.reviewApplication({
    opportunityId: 'opportunity_campus_app', applicationId: 'application_ravi_frontend',
    reviewerId: 'student_priya_nair', decision: 'accepted',
  });
  assert.equal(denied.reason, 'forbidden');
  assert.equal(storage.getById('applications', 'application_ravi_frontend').status, 'pending');

  const accepted = projectService.reviewApplication({
    opportunityId: 'opportunity_campus_app', applicationId: 'application_ravi_frontend',
    reviewerId: 'student_arjun_sharma', decision: 'accepted',
  });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.application.status, 'accepted');
  assert.equal(accepted.opportunity.status, 'active');
  assert.ok(projectService.getAcceptedTeam('opportunity_campus_app').some((student) => student.id === 'student_ravi_kumar'));

  const secondReview = projectService.reviewApplication({
    opportunityId: 'opportunity_campus_app', applicationId: 'application_ravi_frontend',
    reviewerId: 'student_arjun_sharma', decision: 'rejected',
  });
  assert.equal(secondReview.reason, 'already-reviewed');
});

test('rejecting an application leaves an open opportunity open', () => {
  const result = projectService.reviewApplication({
    opportunityId: 'opportunity_campus_app', applicationId: 'application_ravi_frontend',
    reviewerId: 'student_arjun_sharma', decision: 'rejected',
  });
  assert.equal(result.ok, true);
  assert.equal(result.application.status, 'rejected');
  assert.equal(storage.getById('opportunities', 'opportunity_campus_app').status, 'open');
  assert.equal(projectService.getAcceptedTeam('opportunity_campus_app').length, 0);
});

test('completed opportunities no longer permit application review', () => {
  storage.update('opportunities', 'opportunity_campus_app', { status: 'active' });
  storage.update('applications', 'application_ravi_frontend', { status: 'pending' });
  const completed = projectService.transitionOpportunity({
    opportunityId: 'opportunity_campus_app', actorId: 'student_arjun_sharma', nextStatus: 'completed',
  });
  assert.equal(completed.ok, true);
  const review = projectService.reviewApplication({
    opportunityId: 'opportunity_campus_app', applicationId: 'application_ravi_frontend',
    reviewerId: 'student_arjun_sharma', decision: 'accepted',
  });
  assert.equal(review.reason, 'closed');
  assert.equal(storage.getById('applications', 'application_ravi_frontend').status, 'pending');
});

test('opportunity lifecycle permits active to completed to archived only for owner', () => {
  const wrongOwner = projectService.transitionOpportunity({
    opportunityId: 'opportunity_ml_study_tool', actorId: 'student_ravi_kumar', nextStatus: 'completed',
  });
  assert.equal(wrongOwner.reason, 'forbidden');

  const completed = projectService.transitionOpportunity({
    opportunityId: 'opportunity_ml_study_tool', actorId: 'student_priya_nair', nextStatus: 'completed',
  });
  assert.equal(completed.ok, true);
  assert.equal(completed.opportunity.status, 'completed');

  const archived = projectService.transitionOpportunity({
    opportunityId: 'opportunity_ml_study_tool', actorId: 'student_priya_nair', nextStatus: 'archived',
  });
  assert.equal(archived.ok, true);
  assert.equal(archived.opportunity.status, 'archived');

  const invalid = projectService.transitionOpportunity({
    opportunityId: 'opportunity_ml_study_tool', actorId: 'student_priya_nair', nextStatus: 'active',
  });
  assert.equal(invalid.reason, 'invalid-transition');
});
