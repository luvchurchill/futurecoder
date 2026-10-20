// A synchronous snapshot survives closing immediately after a successful step.
// IndexedDB remains available for existing profiles and as a fallback.
const key = "futurecoder-offline-progress";

export function readProgressSnapshot() {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved?.uid && saved?.pagesProgress ? saved : null;
  } catch {
    return null;
  }
}

export function saveProgressSnapshot(user) {
  try {
    localStorage.setItem(key, JSON.stringify(user));
  } catch {
    // Do not let an older snapshot override newer IndexedDB saves after quota failure.
    try { localStorage.removeItem(key); } catch {}
  }
}
