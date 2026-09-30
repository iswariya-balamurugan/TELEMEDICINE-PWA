/**
 * AES-GCM encryption for everything written to the device.
 * The key is derived with PBKDF2 from the health worker's field PIN, so the
 * IndexedDB contents are unreadable without it.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

let cachedKey: CryptoKey | null = null;

function toB64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(value: string) {
  const raw = atob(value);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const SALT = enc.encode("aetheris-rural-telemedicine-v1");

export async function unlock(pin: string) {
  const material = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, [
    "deriveKey",
  ]);
  cachedKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: 120_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return cachedKey;
}

export function isUnlocked() {
  return cachedKey !== null;
}

export function lock() {
  cachedKey = null;
}

export type Sealed = { iv: string; data: string };

export async function seal(value: unknown): Promise<Sealed> {
  if (!cachedKey) throw new Error("Local storage is locked");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cachedKey,
    enc.encode(JSON.stringify(value)),
  );
  return { iv: toB64(iv), data: toB64(new Uint8Array(buf)) };
}

export async function open<T>(sealed: Sealed): Promise<T> {
  if (!cachedKey) throw new Error("Local storage is locked");
  const buf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(sealed.iv) },
    cachedKey,
    fromB64(sealed.data),
  );
  return JSON.parse(dec.decode(buf)) as T;
}

/** First ~48 chars of the stored ciphertext, for the "what's on disk" preview. */
export function cipherPreview(sealed: Sealed) {
  return sealed.data.slice(0, 48) + "…";
}
