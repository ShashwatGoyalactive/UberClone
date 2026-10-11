/**
 * Structured logging: one JSON line per event, which Vercel captures.
 *
 * Log events, not prose — `log.info("demo.created", { role })`. Never pass
 * the fields docs/SECURITY.md §7 forbids (codes, PINs, tokens, emails,
 * phone numbers). This wrapper is the only place console is used.
 */

type Context = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn" | "error", event: string, context: Context = {}) {
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...context });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (event: string, context?: Context) => write("info", event, context),
  warn: (event: string, context?: Context) => write("warn", event, context),
  error: (event: string, context: Context & { errorId: string }) => write("error", event, context),
};
