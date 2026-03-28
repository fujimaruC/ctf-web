// js/crypto.js
// Zero-Trust flag hashing via Web Crypto API — raw flag NEVER leaves the browser.

/**
 * Hashes a string using SHA-256 via the native Web Crypto API.
 * @param {string} input — plain-text flag entered by the user
 * @returns {Promise<string>} — lowercase hex digest
 */
export async function sha256(input) {
  const msgBuffer  = new TextEncoder().encode(input.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates a user-supplied flag against the stored hash without
 * ever transmitting the raw flag to Firestore.
 * Normalizes input: trims, removes internal whitespace, strips quotes.
 * @param {string} rawFlag
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
export async function validateFlag(rawFlag, storedHash) {
  // Normalize: trim, remove internal whitespace, strip surrounding quotes
  let normalized = rawFlag.trim();
  normalized = normalized.replace(/\s+/g, "");
  if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1);
  }
  
  const inputHash = await sha256(normalized);
  // Constant-time comparison mitigates timing attacks in JS context
  if (inputHash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < inputHash.length; i++) {
    diff |= inputHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}