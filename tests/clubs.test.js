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
let clubService;
let validation;
let validators;
let seed;

before(async () => {
  ({ storage } = await import('../js/shared/storage.js'));
  ({ seed } = await import('../js/shared/seed.js'));
  ({ clubService } = await import('../js/clubs/clubService.js'));
  ({ validation, validators } = await import('../js/shared/validation.js'));
});

beforeEach(() => {
  storage.resetDemoData();
});

test('seeded club roster includes organiser as an implicit member', () => {
  const members = clubService.getClubMembers('club_robotics_circle');
  assert.equal(members.length, 4);
  assert.equal(members[0].id, 'student_arjun_sharma');
  assert.equal(members[0].membershipRole, 'Organiser');
  assert.equal(members.filter((member) => member.id === 'student_arjun_sharma').length, 1);
});

test('joining creates one membership and duplicate joins are blocked', () => {
  const created = storage.insert('clubs', {
    title: 'Campus AI Builders',
    description: 'A temporary group to explore practical AI tools and build small campus experiments.',
    category: 'Technology',
    duration: '4 weeks',
    goal: 'Learn together and demonstrate one small working AI prototype.',
    organiserId: 'student_arjun_sharma',
    status: 'active',
    archivedAt: null,
  });

  const firstJoin = clubService.joinClub(created.id, 'student_priya_nair');
  assert.equal(firstJoin.ok, true);
  assert.equal(storage.query('clubMemberships', (item) => item.clubId === created.id && item.studentId === 'student_priya_nair').length, 1);

  const duplicateJoin = clubService.joinClub(created.id, 'student_priya_nair');
  assert.equal(duplicateJoin.ok, false);
  assert.equal(duplicateJoin.reason, 'duplicate');
  assert.equal(storage.query('clubMemberships', (item) => item.clubId === created.id && item.studentId === 'student_priya_nair').length, 1);
  assert.equal(clubService.getClubMembers(created.id).length, 2);
});

test('organiser cannot create a duplicate membership for themselves', () => {
  const result = clubService.joinClub('club_robotics_circle', 'student_arjun_sharma');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'organiser');
  assert.equal(storage.query('clubMemberships', (item) => item.clubId === 'club_robotics_circle' && item.studentId === 'student_arjun_sharma').length, 0);
});

test('only the organiser can archive an active club', () => {
  const denied = clubService.archiveClub('club_robotics_circle', 'student_priya_nair');
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'forbidden');
  assert.equal(storage.getById('clubs', 'club_robotics_circle').status, 'active');

  const archived = clubService.archiveClub('club_robotics_circle', 'student_arjun_sharma');
  assert.equal(archived.ok, true);
  assert.equal(archived.club.status, 'archived');
  assert.ok(archived.club.archivedAt);
  assert.equal(clubService.getClubMembers('club_robotics_circle').length, 4);
});

test('archived clubs reject new memberships and cannot be archived twice', () => {
  const archived = clubService.archiveClub('club_robotics_circle', 'student_arjun_sharma');
  assert.equal(archived.ok, true);

  const joinAttempt = clubService.joinClub('club_robotics_circle', 'student_meera_patel');
  assert.equal(joinAttempt.ok, false);
  assert.equal(joinAttempt.reason, 'archived');

  const archiveAgain = clubService.archiveClub('club_robotics_circle', 'student_arjun_sharma');
  assert.equal(archiveAgain.ok, false);
  assert.equal(archiveAgain.reason, 'already-archived');
});

test('unknown club and unknown student are rejected', () => {
  assert.equal(clubService.joinClub('missing-club', 'student_priya_nair').reason, 'not-found');
  assert.equal(clubService.joinClub('club_robotics_circle', 'missing-student').reason, 'invalid-student');
  assert.equal(clubService.archiveClub('missing-club', 'student_arjun_sharma').reason, 'not-found');
});

test('club form validation requires all five fields and validates bounds/category', () => {
  const rules = {
    title: [
      (value) => validators.required(value, 'Club name'),
      (value) => validators.minLength(value, 5, 'Club name'),
      (value) => validators.maxLength(value, 100, 'Club name'),
    ],
    description: [
      (value) => validators.required(value, 'Description'),
      (value) => validators.minLength(value, 10, 'Description'),
      (value) => validators.maxLength(value, 1000, 'Description'),
    ],
    category: [
      (value) => validators.required(value, 'Category'),
      (value) => validators.isEnum(value, ['Technology', 'Arts', 'Sports', 'Academic', 'Social'], 'Category'),
    ],
    duration: [
      (value) => validators.required(value, 'Intended duration'),
      (value) => validators.minLength(value, 3, 'Intended duration'),
    ],
    goal: [
      (value) => validators.required(value, 'Group goal'),
      (value) => validators.minLength(value, 10, 'Group goal'),
      (value) => validators.maxLength(value, 500, 'Group goal'),
    ],
  };

  const empty = validation.validateForm({ title: '', description: '', category: '', duration: '', goal: '' }, rules);
  assert.equal(empty.valid, false);
  assert.equal(Object.keys(empty.errors).length, 5);

  const invalidCategory = validation.validateForm({
    title: 'Valid Club', description: 'A valid description for the club.', category: 'Other',
    duration: '4 weeks', goal: 'A valid goal for this temporary group.',
  }, rules);
  assert.equal(invalidCategory.valid, false);
  assert.ok(invalidCategory.errors.category);

  const valid = validation.validateForm({
    title: 'Campus AI Builders', description: 'A valid description for the club.', category: 'Technology',
    duration: '4 weeks', goal: 'A valid goal for this temporary group.',
  }, rules);
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});
