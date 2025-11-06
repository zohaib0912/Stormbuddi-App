// Minimal JS event bus for cross-component notifications without extra deps
const listenersMap = new Map();

export const subscribe = (eventName, callback) => {
  const listeners = listenersMap.get(eventName) || new Set();
  listeners.add(callback);
  listenersMap.set(eventName, listeners);
  return () => {
    const current = listenersMap.get(eventName);
    if (!current) return;
    current.delete(callback);
    if (current.size === 0) listenersMap.delete(eventName);
  };
};

export const emit = (eventName, payload) => {
  const listeners = listenersMap.get(eventName);
  if (!listeners) return;
  listeners.forEach((cb) => {
    try { cb(payload); } catch (_) {}
  });
};

export default { subscribe, emit };


