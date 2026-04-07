/** HTTP-only session cookie name (avoid `__Host-` so local HTTP dev works without `Secure`). */
export const SESSION_COOKIE_NAME = "aisprints_session";

/** Seven days, in seconds (cookie `maxAge`). */
export const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;

/** PBKDF2 iteration count (Web Crypto). */
export const PBKDF2_ITERATIONS = 100_000;

/** Derived key length in bits. */
export const PBKDF2_KEY_BITS = 256;
