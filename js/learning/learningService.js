import { storage } from '../shared/storage.js';

export const LEARNING_MODES = Object.freeze(['one-on-one', 'group', 'self-paced']);
export const MENTORSHIP_STATUSES = Object.freeze(['pending', 'accepted', 'rejected']);

function result(ok, reason = null, extra = {}) {
  return { ok, reason, ...extra };
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getOfferAcceptedCount(offerId) {
  return storage.query('mentorshipRequests', (request) =>
    request.offerId === offerId && request.status === 'accepted',
  ).length;
}

function getOfferRequests(offerId) {
  return storage.query('mentorshipRequests', (request) => request.offerId === offerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getGroupForRequest(request) {
  if (request.groupId) return storage.getById('learningGroups', request.groupId);
  return storage.query('learningGroups', (group) =>
    group.mentorId === request.mentorId && group.learnerIds.includes(request.learnerId),
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}

function createMentorOffer(mentorId, details) {
  const mentor = storage.getById('students', mentorId);
  if (!mentor) return result(false, 'invalid-mentor');
  if (!details || !Array.isArray(details.topics)) return result(false, 'invalid-topics');

  const seenTopics = new Set();
  const topics = [];
  for (const rawTopic of details.topics) {
    const topic = cleanString(rawTopic);
    const key = topic.toLocaleLowerCase();
    if (!topic || seenTopics.has(key)) continue;
    seenTopics.add(key);
    topics.push(topic);
  }
  if (topics.length < 1 || topics.some((topic) => topic.length < 2 || topic.length > 60)) {
    return result(false, 'invalid-topics');
  }

  const description = cleanString(details.description);
  if (description.length < 10 || description.length > 1000) return result(false, 'invalid-description');

  const availability = cleanString(details.availability);
  if (availability.length > 120) return result(false, 'invalid-availability');

  const maxLearners = Number(details.maxLearners);
  if (!Number.isInteger(maxLearners) || maxLearners < 1) return result(false, 'invalid-capacity');

  const offer = storage.insert('mentorOffers', {
    mentorId,
    topics,
    description,
    availability,
    maxLearners,
    status: 'open',
  });
  return result(true, null, { offer });
}

function closeMentorOffer(offerId, actorId) {
  const offer = storage.getById('mentorOffers', offerId);
  if (!offer) return result(false, 'not-found');
  if (offer.mentorId !== actorId) return result(false, 'forbidden');
  if (offer.status !== 'open') return result(false, 'already-closed');

  const updated = storage.update('mentorOffers', offerId, { status: 'closed' });
  if (!updated) return result(false, 'update-failed');
  return result(true, null, { offer: updated });
}

function createLearningRequest(requesterId, details) {
  const requester = storage.getById('students', requesterId);
  if (!requester) return result(false, 'invalid-requester');

  const topic = cleanString(details?.topic);
  const goal = cleanString(details?.goal);
  const mode = cleanString(details?.mode);

  if (topic.length < 3 || topic.length > 80) return result(false, 'invalid-topic');
  if (goal.length < 10 || goal.length > 500) return result(false, 'invalid-goal');
  if (mode && !LEARNING_MODES.includes(mode)) return result(false, 'invalid-mode');

  const request = storage.insert('learningRequests', {
    requesterId,
    topic,
    goal,
    mode,
    status: 'open',
  });
  return result(true, null, { request });
}

function closeLearningRequest(requestId, actorId) {
  const request = storage.getById('learningRequests', requestId);
  if (!request) return result(false, 'not-found');
  if (request.requesterId !== actorId) return result(false, 'forbidden');
  if (request.status !== 'open') return result(false, 'already-closed');

  const updated = storage.update('learningRequests', requestId, { status: 'closed' });
  if (!updated) return result(false, 'update-failed');
  return result(true, null, { request: updated });
}

function createMentorshipRequest({ learnerId, offerId, message = '' }) {
  const learner = storage.getById('students', learnerId);
  const offer = storage.getById('mentorOffers', offerId);
  if (!learner) return result(false, 'invalid-learner');
  if (!offer) return result(false, 'offer-not-found');
  if (offer.mentorId === learnerId) return result(false, 'self-request');
  if (offer.status !== 'open') return result(false, 'offer-closed');

  const acceptedCount = getOfferAcceptedCount(offerId);
  if (acceptedCount >= offer.maxLearners) return result(false, 'capacity-reached');

  const duplicate = storage.query('mentorshipRequests', (request) =>
    request.offerId === offerId && request.learnerId === learnerId && ['pending', 'accepted'].includes(request.status),
  )[0];
  if (duplicate) return result(false, 'duplicate', { request: duplicate });

  const cleanMessage = cleanString(message);
  if (cleanMessage.length > 500) return result(false, 'invalid-message');

  const request = storage.insert('mentorshipRequests', {
    learnerId,
    mentorId: offer.mentorId,
    offerId,
    message: cleanMessage,
    status: 'pending',
  });
  return result(true, null, { request });
}

function findReusableGroup(offer) {
  const acceptedRequests = storage.query('mentorshipRequests', (request) =>
    request.offerId === offer.id && request.status === 'accepted',
  ).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  for (const acceptedRequest of acceptedRequests) {
    let group = acceptedRequest.groupId
      ? storage.getById('learningGroups', acceptedRequest.groupId)
      : null;

    // Phase 2 browser storage predates the optional groupId relationship. Recover
    // the existing active group from its mentor/learner membership instead of
    // silently creating a second group when users upgrade the project folder.
    if (!group) {
      group = storage.query('learningGroups', (candidate) =>
        candidate.mentorId === acceptedRequest.mentorId &&
        candidate.learnerIds.includes(acceptedRequest.learnerId) &&
        candidate.status === 'active',
      ).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0] || null;

      if (group && !acceptedRequest.groupId) {
        storage.update('mentorshipRequests', acceptedRequest.id, { groupId: group.id });
      }
    }

    if (group?.status === 'active') return group;
  }
  return null;
}

function reviewMentorshipRequest({ requestId, reviewerId, decision }) {
  const request = storage.getById('mentorshipRequests', requestId);
  if (!request) return result(false, 'not-found');
  if (request.mentorId !== reviewerId) return result(false, 'forbidden');
  if (request.status !== 'pending') return result(false, 'already-reviewed');
  if (!['accepted', 'rejected'].includes(decision)) return result(false, 'invalid-decision');

  const offer = storage.getById('mentorOffers', request.offerId);
  if (!offer) return result(false, 'offer-not-found');

  if (decision === 'rejected') {
    const updatedRequest = storage.update('mentorshipRequests', requestId, { status: 'rejected' });
    if (!updatedRequest) return result(false, 'update-failed');
    return result(true, null, { request: updatedRequest, group: null });
  }

  const acceptedCount = getOfferAcceptedCount(offer.id);
  if (acceptedCount >= offer.maxLearners) return result(false, 'capacity-reached');

  let group = findReusableGroup(offer);
  let insertedGroup = false;
  let previousLearnerIds = null;
  try {
    if (group) {
      previousLearnerIds = [...group.learnerIds];
      if (!group.learnerIds.includes(request.learnerId)) {
        group = storage.update('learningGroups', group.id, {
          learnerIds: [...group.learnerIds, request.learnerId],
        });
      }
    } else {
      const topic = offer.topics.join(' · ');
      group = storage.insert('learningGroups', {
        mentorId: offer.mentorId,
        learnerIds: [request.learnerId],
        topic,
        status: 'active',
      });
      insertedGroup = true;
    }

    const updatedRequest = storage.update('mentorshipRequests', requestId, { status: 'accepted', groupId: group.id });
    if (!updatedRequest) throw new Error('Could not update the mentorship request.');
    return result(true, null, { request: updatedRequest, group });
  } catch (error) {
    // Best-effort rollback keeps the request pending if a related group write fails.
    if (insertedGroup && group?.id) storage.remove('learningGroups', group.id);
    else if (group?.id && previousLearnerIds) {
      storage.update('learningGroups', group.id, { learnerIds: previousLearnerIds });
    }
    return result(false, 'save-failed', { error });
  }
}

function getGroupParticipants(groupId) {
  const group = storage.getById('learningGroups', groupId);
  if (!group) return [];
  const ids = [...new Set([group.mentorId, ...group.learnerIds])];
  return ids.map((id) => storage.getById('students', id)).filter(Boolean).map((student) => ({
    ...student,
    groupRole: student.id === group.mentorId ? 'Mentor' : 'Learner',
  }));
}

function addLearningMilestone({ groupId, actorId, title }) {
  const group = storage.getById('learningGroups', groupId);
  if (!group) return result(false, 'group-not-found');
  const isParticipant = group.mentorId === actorId || group.learnerIds.includes(actorId);
  if (!isParticipant) return result(false, 'forbidden');
  if (group.status !== 'active') return result(false, 'group-completed');

  const cleanTitle = cleanString(title);
  if (cleanTitle.length < 3 || cleanTitle.length > 120) return result(false, 'invalid-title');

  const milestone = storage.insert('learningMilestones', {
    groupId,
    title: cleanTitle,
    completed: false,
  });
  return result(true, null, { milestone });
}

function toggleLearningMilestone({ groupId, milestoneId, actorId }) {
  const group = storage.getById('learningGroups', groupId);
  if (!group) return result(false, 'group-not-found');
  const isParticipant = group.mentorId === actorId || group.learnerIds.includes(actorId);
  if (!isParticipant) return result(false, 'forbidden');
  if (group.status !== 'active') return result(false, 'group-completed');

  const milestone = storage.getById('learningMilestones', milestoneId);
  if (!milestone || milestone.groupId !== groupId) return result(false, 'milestone-not-found');

  const updated = storage.update('learningMilestones', milestoneId, { completed: !milestone.completed });
  if (!updated) return result(false, 'update-failed');
  return result(true, null, { milestone: updated });
}

function completeLearningGroup({ groupId, actorId }) {
  const group = storage.getById('learningGroups', groupId);
  if (!group) return result(false, 'group-not-found');
  if (group.mentorId !== actorId) return result(false, 'forbidden');
  if (group.status !== 'active') return result(false, 'already-completed');

  const updated = storage.update('learningGroups', groupId, { status: 'completed' });
  if (!updated) return result(false, 'update-failed');
  return result(true, null, { group: updated });
}

export const learningService = Object.freeze({
  getOfferAcceptedCount,
  getOfferRequests,
  getGroupForRequest,
  getGroupParticipants,
  createMentorOffer,
  closeMentorOffer,
  createLearningRequest,
  closeLearningRequest,
  createMentorshipRequest,
  reviewMentorshipRequest,
  addLearningMilestone,
  toggleLearningMilestone,
  completeLearningGroup,
});
