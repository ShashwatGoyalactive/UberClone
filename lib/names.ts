/**
 * Display names. Pure and browser-safe.
 */

const MAX_NAME = 60;

/**
 * A friendly first guess at a name from an email address, used until the
 * person sets one: "aarav.mehta+rides@x.com" → "Aarav Mehta".
 */
export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.split("+")[0] ?? "";
  // Drop words that are only digits ("priya.1998" → "Priya") but keep
  // digits inside a word ("e2e" stays "E2e", rather than becoming "Ee").
  const words = local
    .split(/[._-]+/)
    .filter((w) => w && !/^\d+$/.test(w))
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase());
  const name = words.join(" ").slice(0, MAX_NAME).trim();
  return name || "Comet rider";
}

/**
 * What the other side of a ride sees: "Aarav M." when the person has
 * chosen to hide their last name (Settings → Privacy), else the full name.
 */
export function publicName(displayName: string, hideLastName: boolean): string {
  const parts = displayName.trim().split(/\s+/);
  if (!hideLastName || parts.length < 2) return displayName.trim();
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}
