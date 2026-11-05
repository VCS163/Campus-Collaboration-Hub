// A deliberately small in-memory event hub. Use it only for cross-module
// notifications such as user changes and collection mutations.
const listeners = new Map();

function on(eventName, callback) {
  if (typeof eventName !== 'string' || typeof callback !== 'function') {
    throw new TypeError('events.on expects an event name and callback.');
  }

  if (!listeners.has(eventName)) listeners.set(eventName, new Set());
  listeners.get(eventName).add(callback);

  return () => off(eventName, callback);
}

function off(eventName, callback) {
  const callbacks = listeners.get(eventName);
  if (!callbacks) return false;

  const removed = callbacks.delete(callback);
  if (callbacks.size === 0) listeners.delete(eventName);
  return removed;
}

function emit(eventName, detail = {}) {
  const callbacks = listeners.get(eventName);
  if (!callbacks) return;

  for (const callback of [...callbacks]) {
    try {
      callback(detail);
    } catch (error) {
      // A subscriber must not prevent other subscribers from receiving an event.
      console.error(`Error in ${eventName} event subscriber:`, error);
    }
  }
}

export const events = Object.freeze({ on, off, emit });
