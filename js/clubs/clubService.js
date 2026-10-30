import { storage } from '../shared/storage.js';

export const CLUB_CATEGORIES = Object.freeze([
  'Technology',
  'Arts',
  'Sports',
  'Academic',
  'Social',
]);

/**
 * Returns the visible club roster. The organiser is an implicit member under
 * the MVP data model and therefore does not need a ClubMembership row.
 */
function getClubMembers(clubId) {
  const club = storage.getById('clubs', clubId);
  if (!club) return [];

  const students = storage.get('students');
  const memberships = storage.query(
    'clubMemberships',
    (membership) => membership.clubId === clubId,
  );
  const members = [];
  const seenStudentIds = new Set();

  const organiser = students.find((student) => student.id === club.organiserId);
  if (organiser) {
    members.push({ ...organiser, membershipRole: 'Organiser' });
    seenStudentIds.add(organiser.id);
  }

  for (const membership of memberships) {
    if (seenStudentIds.has(membership.studentId)) continue;
    const student = students.find((item) => item.id === membership.studentId);
    if (!student) continue;

    members.push({ ...student, membershipRole: 'Member' });
    seenStudentIds.add(student.id);
  }

  return members;
}

function joinClub(clubId, studentId) {
  const club = storage.getById('clubs', clubId);
  if (!club) return { ok: false, reason: 'not-found', message: 'This club could not be found.' };
  if (club.status !== 'active') {
    return { ok: false, reason: 'archived', message: 'This club has ended and is read-only.' };
  }

  const student = storage.getById('students', studentId);
  if (!student) {
    return {
      ok: false,
      reason: 'invalid-student',
      message: 'Select a valid demo student before joining.',
    };
  }
  if (club.organiserId === studentId) {
    return { ok: false, reason: 'organiser', message: 'You already organise this club.' };
  }

  const existingMembership = storage.query(
    'clubMemberships',
    (membership) => membership.clubId === clubId && membership.studentId === studentId,
  )[0];
  if (existingMembership) {
    return { ok: false, reason: 'duplicate', message: 'You are already a member of this club.' };
  }

  const membership = storage.insert('clubMemberships', {
    clubId,
    studentId,
    joinedAt: new Date().toISOString(),
  });

  return { ok: true, reason: 'joined', message: `You joined ${club.title}.`, membership };
}

function archiveClub(clubId, actorId) {
  const club = storage.getById('clubs', clubId);
  if (!club) return { ok: false, reason: 'not-found', message: 'This club could not be found.' };

  const actor = storage.getById('students', actorId);
  if (!actor) {
    return {
      ok: false,
      reason: 'invalid-student',
      message: 'Select a valid demo student before archiving.',
    };
  }
  if (club.organiserId !== actorId) {
    return { ok: false, reason: 'forbidden', message: 'Only the organiser can archive this club.' };
  }
  if (club.status !== 'active') {
    return { ok: false, reason: 'already-archived', message: 'This club is already archived.' };
  }

  const archivedAt = new Date().toISOString();
  const updatedClub = storage.update('clubs', clubId, { status: 'archived', archivedAt });
  if (!updatedClub) {
    return { ok: false, reason: 'update-failed', message: 'The club could not be updated.' };
  }

  return {
    ok: true,
    reason: 'archived',
    message: 'Club archived. Its history and members have been kept.',
    club: updatedClub,
  };
}

export const clubService = Object.freeze({ getClubMembers, joinClub, archiveClub });
