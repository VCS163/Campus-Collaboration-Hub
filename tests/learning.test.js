import test, { before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  #values = new Map();
  get length() {
    return this.#values.size;
  }
  key(index) {
    return [...this.#values.keys()][index] ?? null;
  }
  getItem(key) {
    return this.#values.has(String(key)) ? this.#values.get(String(key)) : null;
  }
  setItem(key, value) {
    this.#values.set(String(key), String(value));
  }
  removeItem(key) {
    this.#values.delete(String(key));
  }
  clear() {
    this.#values.clear();
  }
}

globalThis.localStorage = new MemoryStorage();

let storage;
let seed;
let learningService;

before(async () => {
  ({ storage } = await import('../js/shared/storage.js'));
  ({ seed } = await import('../js/shared/seed.js'));
  ({ learningService } = await import('../js/learning/learningService.js'));
  seed.initialise();
});

beforeEach(() => {
  storage.resetDemoData();
});

test('seed data contains mentor offers, learning requests, an accepted mentorship and a group', () => {
  assert.equal(storage.get('mentorOffers').length, 2);
  assert.equal(storage.get('learningRequests').length, 2);
  assert.equal(
    storage.getById('mentorshipRequests', 'mentorship_request_ravi_priya').status,
    'accepted',
  );
  assert.ok(storage.getById('learningGroups', 'learning_group_python_ml'));
  assert.ok(storage.get('learningMilestones').length >= 2);
});

test('mentor can create an offer with trimmed and deduplicated topics', () => {
  const created = learningService.createMentorOffer('student_meera_patel', {
    topics: ['  Embedded C ', 'PCB Design', 'embedded c'],
    description: 'Help beginners understand firmware structure and debugging.',
    availability: 'Friday evenings',
    maxLearners: 2,
  });
  assert.equal(created.ok, true);
  assert.deepEqual(created.offer.topics, ['Embedded C', 'PCB Design']);
  assert.equal(created.offer.mentorId, 'student_meera_patel');
  assert.equal(created.offer.status, 'open');
});

test('mentor offer creation rejects invalid mentor, topics, description and capacity', () => {
  assert.equal(
    learningService.createMentorOffer('missing-student', {
      topics: ['Python'],
      description: 'A useful description',
      maxLearners: 2,
    }).reason,
    'invalid-mentor',
  );
  assert.equal(
    learningService.createMentorOffer('student_priya_nair', {
      topics: [],
      description: 'A useful description',
      maxLearners: 2,
    }).reason,
    'invalid-topics',
  );
  assert.equal(
    learningService.createMentorOffer('student_priya_nair', {
      topics: ['Python'],
      description: 'short',
      maxLearners: 2,
    }).reason,
    'invalid-description',
  );
  assert.equal(
    learningService.createMentorOffer('student_priya_nair', {
      topics: ['Python'],
      description: 'A useful description',
      maxLearners: 0,
    }).reason,
    'invalid-capacity',
  );
});

test('learner can create and close their own learning request', () => {
  const created = learningService.createLearningRequest('student_ravi_kumar', {
    topic: 'Embedded C',
    goal: 'Write a small interrupt-driven firmware exercise.',
    mode: 'group',
  });
  assert.equal(created.ok, true);
  assert.equal(created.request.requesterId, 'student_ravi_kumar');
  assert.equal(created.request.status, 'open');
  assert.equal(
    learningService.closeLearningRequest(created.request.id, 'student_meera_patel').reason,
    'forbidden',
  );
  const closed = learningService.closeLearningRequest(created.request.id, 'student_ravi_kumar');
  assert.equal(closed.ok, true);
  assert.equal(closed.request.status, 'closed');
});

test('learning request validates topic, goal, mode and requester', () => {
  assert.equal(
    learningService.createLearningRequest('missing', {
      topic: 'Python',
      goal: 'Learn this subject well',
      mode: 'group',
    }).reason,
    'invalid-requester',
  );
  assert.equal(
    learningService.createLearningRequest('student_ravi_kumar', {
      topic: 'AI',
      goal: 'Learn this subject well',
      mode: 'group',
    }).reason,
    'invalid-topic',
  );
  assert.equal(
    learningService.createLearningRequest('student_ravi_kumar', {
      topic: 'Python',
      goal: 'short',
      mode: 'group',
    }).reason,
    'invalid-goal',
  );
  assert.equal(
    learningService.createLearningRequest('student_ravi_kumar', {
      topic: 'Python',
      goal: 'Learn this subject well',
      mode: 'magic',
    }).reason,
    'invalid-mode',
  );
});

test('learner can request mentorship from an open offer but cannot request their own offer', () => {
  const own = learningService.createMentorshipRequest({
    learnerId: 'student_priya_nair',
    offerId: 'mentor_offer_priya_python',
  });
  assert.equal(own.reason, 'self-request');

  const sent = learningService.createMentorshipRequest({
    learnerId: 'student_meera_patel',
    offerId: 'mentor_offer_priya_python',
    message: 'I want to learn Python data preparation for a small project.',
  });
  assert.equal(sent.ok, true);
  assert.equal(sent.request.status, 'pending');
  assert.equal(sent.request.mentorId, 'student_priya_nair');
});

test('duplicate active mentorship requests are blocked but a rejected request can be retried', () => {
  const first = learningService.createMentorshipRequest({
    learnerId: 'student_meera_patel',
    offerId: 'mentor_offer_priya_python',
  });
  assert.equal(first.ok, true);
  const duplicate = learningService.createMentorshipRequest({
    learnerId: 'student_meera_patel',
    offerId: 'mentor_offer_priya_python',
  });
  assert.equal(duplicate.reason, 'duplicate');

  const rejected = learningService.reviewMentorshipRequest({
    requestId: first.request.id,
    reviewerId: 'student_priya_nair',
    decision: 'rejected',
  });
  assert.equal(rejected.ok, true);
  const retry = learningService.createMentorshipRequest({
    learnerId: 'student_meera_patel',
    offerId: 'mentor_offer_priya_python',
  });
  assert.equal(retry.ok, true);
});

test('only the mentor can accept or reject a mentorship request', () => {
  const pending = learningService.createMentorshipRequest({
    learnerId: 'student_meera_patel',
    offerId: 'mentor_offer_priya_python',
  });
  assert.equal(pending.ok, true);
  assert.equal(
    learningService.reviewMentorshipRequest({
      requestId: pending.request.id,
      reviewerId: 'student_ravi_kumar',
      decision: 'accepted',
    }).reason,
    'forbidden',
  );
  assert.equal(
    learningService.reviewMentorshipRequest({
      requestId: pending.request.id,
      reviewerId: 'student_priya_nair',
      decision: 'maybe',
    }).reason,
    'invalid-decision',
  );
});

test('accepting a mentorship request creates or reuses a group and adds the learner', () => {
  const pending = learningService.createMentorshipRequest({
    learnerId: 'student_meera_patel',
    offerId: 'mentor_offer_priya_python',
  });
  const accepted = learningService.reviewMentorshipRequest({
    requestId: pending.request.id,
    reviewerId: 'student_priya_nair',
    decision: 'accepted',
  });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.request.status, 'accepted');
  assert.equal(accepted.request.groupId, accepted.group.id);
  assert.equal(accepted.group.mentorId, 'student_priya_nair');
  assert.ok(accepted.group.learnerIds.includes('student_ravi_kumar'));
  assert.ok(accepted.group.learnerIds.includes('student_meera_patel'));
  assert.equal(learningService.getGroupForRequest(accepted.request).id, accepted.group.id);
  assert.equal(learningService.getGroupParticipants(accepted.group.id).length, 3);
});

test('Phase 2 accepted mentorship records without groupId reuse and backfill their existing active group', () => {
  storage.update('mentorshipRequests', 'mentorship_request_ravi_priya', { groupId: undefined });
  const legacyRequest = storage.getById('mentorshipRequests', 'mentorship_request_ravi_priya');
  assert.equal(legacyRequest.groupId, undefined);

  const pending = learningService.createMentorshipRequest({
    learnerId: 'student_meera_patel',
    offerId: 'mentor_offer_priya_python',
  });
  const accepted = learningService.reviewMentorshipRequest({
    requestId: pending.request.id,
    reviewerId: 'student_priya_nair',
    decision: 'accepted',
  });

  assert.equal(accepted.ok, true);
  assert.equal(accepted.group.id, 'learning_group_python_ml');
  assert.equal(
    storage.getById('mentorshipRequests', 'mentorship_request_ravi_priya').groupId,
    'learning_group_python_ml',
  );
  assert.ok(accepted.group.learnerIds.includes('student_ravi_kumar'));
  assert.ok(accepted.group.learnerIds.includes('student_meera_patel'));
});

test('request cannot be sent to a closed offer or when accepted capacity is full', () => {
  const created = learningService.createMentorOffer('student_arjun_sharma', {
    topics: ['Digital Logic'],
    description: 'Help students understand combinational and sequential logic.',
    maxLearners: 1,
  });
  const request = learningService.createMentorshipRequest({
    learnerId: 'student_ravi_kumar',
    offerId: created.offer.id,
  });
  assert.equal(request.ok, true);
  const accepted = learningService.reviewMentorshipRequest({
    requestId: request.request.id,
    reviewerId: 'student_arjun_sharma',
    decision: 'accepted',
  });
  assert.equal(accepted.ok, true);
  assert.equal(
    learningService.createMentorshipRequest({
      learnerId: 'student_meera_patel',
      offerId: created.offer.id,
    }).reason,
    'capacity-reached',
  );

  const closed = learningService.closeMentorOffer(created.offer.id, 'student_arjun_sharma');
  assert.equal(closed.ok, true);
  assert.equal(
    learningService.createMentorshipRequest({
      learnerId: 'student_meera_patel',
      offerId: created.offer.id,
    }).reason,
    'offer-closed',
  );
});

test('mentor can close own offer but another student cannot', () => {
  assert.equal(
    learningService.closeMentorOffer('mentor_offer_priya_python', 'student_ravi_kumar').reason,
    'forbidden',
  );
  const closed = learningService.closeMentorOffer(
    'mentor_offer_priya_python',
    'student_priya_nair',
  );
  assert.equal(closed.ok, true);
  assert.equal(closed.offer.status, 'closed');
});

test('pending requests can be reviewed after an offer closes, but learner capacity still applies', () => {
  const created = learningService.createMentorOffer('student_arjun_sharma', {
    topics: ['Digital Systems'],
    description: 'Walk through digital design basics and simple logic exercises.',
    maxLearners: 1,
  });
  const request = learningService.createMentorshipRequest({
    learnerId: 'student_ravi_kumar',
    offerId: created.offer.id,
  });
  assert.equal(learningService.closeMentorOffer(created.offer.id, 'student_arjun_sharma').ok, true);
  const accepted = learningService.reviewMentorshipRequest({
    requestId: request.request.id,
    reviewerId: 'student_arjun_sharma',
    decision: 'accepted',
  });
  assert.equal(accepted.ok, true);
});

test('participants can add and toggle milestones; unrelated students cannot', () => {
  const groupId = 'learning_group_python_ml';
  const added = learningService.addLearningMilestone({
    groupId,
    actorId: 'student_ravi_kumar',
    title: 'Complete a pandas data-cleaning exercise',
  });
  assert.equal(added.ok, true);
  assert.equal(added.milestone.completed, false);
  assert.equal(
    learningService.toggleLearningMilestone({
      groupId,
      milestoneId: added.milestone.id,
      actorId: 'student_meera_patel',
    }).reason,
    'forbidden',
  );
  const toggled = learningService.toggleLearningMilestone({
    groupId,
    milestoneId: added.milestone.id,
    actorId: 'student_ravi_kumar',
  });
  assert.equal(toggled.ok, true);
  assert.equal(toggled.milestone.completed, true);
});

test('only the mentor can complete a learning group and completed groups are read-only', () => {
  const groupId = 'learning_group_python_ml';
  assert.equal(
    learningService.completeLearningGroup({ groupId, actorId: 'student_ravi_kumar' }).reason,
    'forbidden',
  );
  const completed = learningService.completeLearningGroup({
    groupId,
    actorId: 'student_priya_nair',
  });
  assert.equal(completed.ok, true);
  assert.equal(completed.group.status, 'completed');
  const milestone = storage.get('learningMilestones')[0];
  assert.equal(
    learningService.toggleLearningMilestone({
      groupId,
      milestoneId: milestone.id,
      actorId: 'student_ravi_kumar',
    }).reason,
    'group-completed',
  );
  assert.equal(
    learningService.addLearningMilestone({
      groupId,
      actorId: 'student_priya_nair',
      title: 'Another checkpoint',
    }).reason,
    'group-completed',
  );
});

test('learning group and milestone operations reject missing or unrelated records', () => {
  assert.equal(
    learningService.addLearningMilestone({
      groupId: 'missing',
      actorId: 'student_priya_nair',
      title: 'A valid title',
    }).reason,
    'group-not-found',
  );
  assert.equal(
    learningService.addLearningMilestone({
      groupId: 'learning_group_python_ml',
      actorId: 'student_priya_nair',
      title: 'No',
    }).reason,
    'invalid-title',
  );
  assert.equal(
    learningService.toggleLearningMilestone({
      groupId: 'learning_group_python_ml',
      milestoneId: 'missing',
      actorId: 'student_priya_nair',
    }).reason,
    'milestone-not-found',
  );
});
