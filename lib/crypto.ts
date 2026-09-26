import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// scrypt key derivation is expensive; memoize per-secret so repeated
// encrypt/decrypt calls (e.g. loading many stored keys) stay fast.
const derivedKeyCache = new Map<string, Buffer>();

/**
 * Derives a 32-byte key from master secret
 */
function getKey(secret: string): Buffer {
  const cached = derivedKeyCache.get(secret);
  if (cached) return cached;
  const key = crypto.scryptSync(secret, '9router-salt-salt-2026', 32);
  derivedKeyCache.set(secret, key);
  return key;
}

/**
 * Encrypt sensitive text (API keys, provider secrets) using AES-256-GCM
 */
export function encrypt(text: string, secret?: string): string {
  const masterKey = secret || process.env.ROUTER_API_KEY || process.env.GATEWAY_SECRET || '9router-default-secure-key';
  const key = getKey(masterKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive text using AES-256-GCM
 */
export function decrypt(cipherText: string, secret?: string): string {
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return cipherText; // not encrypted, return as is

    const [ivHex, tagHex, encryptedHex] = parts;
    const masterKey = secret || process.env.ROUTER_API_KEY || process.env.GATEWAY_SECRET || '9router-default-secure-key';
    const key = getKey(masterKey);

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // If decryption fails (e.g. wrong key), return raw or empty
    return cipherText;
  }
}
