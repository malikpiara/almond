export function generateShortId() {
  return Math.random().toString(36).substring(2, 15);
  // Result: something like "k3j5h2m9x4a"
}

export function generateEntryId() {
  return 'entry_' + generateShortId();
  // Result: something like "entry_k3j5h2m9x4a"
}
