import CryptoJS from "crypto-js";

/**
 * Generate a shared encryption key from two user IDs.
 * The key is deterministic and the same for both users.
 */
export function getSharedKey(userId1, userId2) {
  const sorted = [userId1, userId2].sort().join("-");
  return CryptoJS.SHA256(sorted).toString();
}

/**
 * Encrypt a text message using AES
 */
export function encryptMessage(text, sharedKey) {
  if (!text) return text;
  return CryptoJS.AES.encrypt(text, sharedKey).toString();
}

/**
 * Decrypt a text message using AES
 */
export function decryptMessage(cipherText, sharedKey) {
  if (!cipherText) return cipherText;
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, sharedKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText; // Fallback if decryption fails
  } catch {
    return cipherText; // Return original if can't decrypt
  }
}
