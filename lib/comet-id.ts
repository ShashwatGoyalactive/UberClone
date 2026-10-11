/**
 * Comet IDs: the permanent public identifier on every account, e.g.
 * CMT-7K4Q9X. Shown to support, used for referrals, printed on the
 * Pilot card so riders can check who picked them up.
 *
 * Six characters of Crockford base32 — digits plus letters without
 * I, L, O and U — so an ID read aloud or typed from a screenshot can't
 * be confused (no 0/O, 1/I/L) and can't spell most words. 32^6 is about
 * a billion IDs; collisions are handled by the caller retrying, and the
 * database's unique index is the final guard.
 *
 * Pure: randomness is injected so tests are deterministic.
 */

export const COMET_ID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const COMET_ID_PATTERN = /^CMT-[0-9A-HJKMNP-TV-Z]{6}$/;

/** Returns a value in [0, 1), like Math.random. */
export type RandomSource = () => number;

export function generateCometId(random: RandomSource): string {
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += COMET_ID_ALPHABET[Math.floor(random() * COMET_ID_ALPHABET.length)];
  }
  return `CMT-${body}`;
}

/**
 * Normalises what a person typed into a Comet ID, or returns null.
 * Accepts lowercase, a missing "CMT-" prefix, spaces, and the common
 * look-alikes Crockford maps back (O→0, I/L→1).
 */
export function parseCometId(input: string): string | null {
  const cleaned = input.toUpperCase().replace(/[\s-]/g, "").replace(/^CMT/, "");
  const mapped = cleaned.replace(/O/g, "0").replace(/[IL]/g, "1");
  const id = `CMT-${mapped}`;
  return COMET_ID_PATTERN.test(id) ? id : null;
}

/** Cryptographically strong default for production use. */
export function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}
