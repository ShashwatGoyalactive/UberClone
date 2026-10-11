/**
 * The error vocabulary shared by services, actions and the UI
 * (docs/CODE_STYLE.md §7, docs/API.md "Error codes").
 *
 * Services throw AppError with a stable code and a message safe to show.
 * Server Actions turn it into an ActionResult so the client can switch on
 * `code` without ever seeing a raw Error, a Prisma error or a stack trace.
 */

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "INVALID_CODE"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; code: ErrorCode; message: string; errorId?: string };

/** A short, human-readable reference for an unexpected error. */
export function newErrorId(random: () => number = Math.random): string {
  return Array.from(
    { length: 4 },
    () => "23456789ABCDEFGHJKMNPQRSTVWXYZ"[Math.floor(random() * 29)],
  ).join("");
}
