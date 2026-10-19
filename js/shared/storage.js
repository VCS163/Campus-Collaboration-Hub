import { events } from './events.js';

export const COLLECTIONS = Object.freeze([
  'students',
  'clubs',
  'clubMemberships',
  'opportunities',
  'projectRoles',
  'applications',
  'mentorOffers',
  'learningRequests',
  'mentorshipRequests',
  'learningGroups',
  'learningMilestones',
  'communities',
  'posts',
  'comments',
  'reactions',
]);

const COLLECTION_SET = new Set(COLLECTIONS);
const KEY_PREFIX = 'cch_';
let seedInitializer = null;

export class StorageError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'StorageError';
  }
}

function getLocalStorage() {
  try {
    if (!globalThis.localStorage) throw new Error('Browser storage is unavailable.');
    return globalThis.localStorage;
  } catch (error) {
    throw new StorageError('Local storage is unavailable. Use a normal browser window and allow site data.', error);
  }
}

function assertCollection(collection) {
  if (!COLLECTION_SET.has(collection)) {
    throw new TypeError(`Unknown collection "${collection}". Expected one of: ${COLLECTIONS.join(', ')}.`);
  }
}

function collectionKey(collection) {
  assertCollection(collection);
  return `${KEY_PREFIX}${collection}`;
}

function createId(collection) {
  const randomPart = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${collection}_${Date.now()}_${randomPart}`;
}

function readCollection(collection) {
  const storage = getLocalStorage();
  const rawValue = storage.getItem(collectionKey(collection));
  if (rawValue === null) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      console.warn(`The cch_${collection} value is not an array. Treating it as empty until the next save.`);
      return [];
    }
    return parsed.filter((record) => record && typeof record === 'object' && !Array.isArray(record));
  } catch (error) {
    // Do not crash the application or silently destroy the raw value on read.
    console.warn(`Could not parse cch_${collection}. The collection will be treated as empty.`, error);
    return [];
  }
}

function writeCollection(collection, records, action, record = null) {
  try {
    getLocalStorage().setItem(collectionKey(collection), JSON.stringify(records));
  } catch (error) {
    const message = error?.name === 'QuotaExceededError'
      ? 'Browser storage is full. Remove some demo data and try again.'
      : 'Could not save this change to browser storage.';
    throw new StorageError(message, error);
  }

  events.emit(`dataChanged:${collection}`, { collection, action, record });
}

function get(collection) {
  return readCollection(collection);
}

function getById(collection, id) {
  return get(collection).find((record) => record.id === id) ?? null;
}

function insert(collection, record) {
  assertCollection(collection);
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new TypeError('storage.insert expects a record object.');
  }

  const records = get(collection);
  const now = new Date().toISOString();
  const nextRecord = {
    ...record,
    id: record.id || createId(collection),
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || record.createdAt || now,
  };

  if (records.some((item) => item.id === nextRecord.id)) {
    throw new StorageError(`A ${collection} record with id "${nextRecord.id}" already exists.`);
  }

  records.push(nextRecord);
  writeCollection(collection, records, 'insert', nextRecord);
  return { ...nextRecord };
}

function update(collection, id, patch) {
  assertCollection(collection);
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new TypeError('storage.update expects a patch object.');
  }

  const records = get(collection);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return null;

  const safePatch = { ...patch };
  delete safePatch.id;
  delete safePatch.createdAt;

  const updatedRecord = {
    ...records[index],
    ...safePatch,
    id: records[index].id,
    createdAt: records[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  records[index] = updatedRecord;
  writeCollection(collection, records, 'update', updatedRecord);
  return { ...updatedRecord };
}

function remove(collection, id) {
  assertCollection(collection);
  const records = get(collection);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return false;

  const [removedRecord] = records.splice(index, 1);
  writeCollection(collection, records, 'remove', removedRecord);
  return true;
}

function query(collection, filterFn) {
  if (typeof filterFn !== 'function') throw new TypeError('storage.query expects a filter function.');
  return get(collection).filter(filterFn);
}

function getCurrentUserId() {
  try {
    return getLocalStorage().getItem(`${KEY_PREFIX}currentUserId`);
  } catch {
    return null;
  }
}

function registerSeedInitializer(initializer) {
  if (typeof initializer !== 'function') throw new TypeError('Seed initializer must be a function.');
  seedInitializer = initializer;
}

function resetDemoData() {
  const storage = getLocalStorage();
  const keysToRemove = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(KEY_PREFIX)) keysToRemove.push(key);
  }

  keysToRemove.forEach((key) => storage.removeItem(key));

  if (typeof seedInitializer !== 'function') {
    throw new StorageError('Seed data has not been registered. Refresh the app before resetting demo data.');
  }

  seedInitializer();
  events.emit('demoDataReset', { removedKeys: keysToRemove.length });
  return true;
}

export const storage = Object.freeze({
  get,
  getById,
  insert,
  update,
  remove,
  query,
  resetDemoData,
  getCurrentUserId,
  registerSeedInitializer,
  getCollectionNames: () => [...COLLECTIONS],
});
