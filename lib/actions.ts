import "server-only";

import { AppError, newErrorId, type ActionResult } from "@/lib/errors";
import { log } from "@/lib/log";

/**
 * Runs a Server Action body and converts the outcome into an ActionResult
 * (docs/CODE_STYLE.md §7). AppErrors keep their code and safe message;
 * anything else is logged with an error ID and reported generically, so a
 * Prisma error or stack trace never reaches the browser.
 */
export async function runAction<T>(
  event: string,
  body: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body() };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, code: err.code, message: err.message };
    const errorId = newErrorId();
    log.error(`${event}.failed`, {
      errorId,
      error: err instanceof Error ? err.name : "unknown",
    });
    return {
      ok: false,
      code: "INTERNAL",
      message: "Something went wrong on our side. Please try again.",
      errorId,
    };
  }
}
