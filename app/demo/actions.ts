"use server";

import { runAction } from "@/lib/actions";
import { getAuthIdentity } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { setUpDemo } from "@/lib/services/accounts";
import { demoRoleSchema } from "@/lib/validation/auth";

/**
 * Called by the demo screen right after the browser has signed in
 * anonymously (see lib/supabase/browser.ts for why that happens in the
 * browser). Creates the demo account for this session and says where to go.
 */
export async function startDemoAction(input: { role: unknown; simulatedPilot?: unknown }) {
  return runAction("demo.start", async () => {
    const parsed = demoRoleSchema.safeParse(input?.role);
    if (!parsed.success) throw new AppError("VALIDATION", "Pick rider or Pilot to continue.");

    const identity = await getAuthIdentity();
    if (!identity)
      throw new AppError("UNAUTHENTICATED", "Your demo session didn't start. Try again.");

    const simulatedPilot = input?.simulatedPilot !== false;
    await setUpDemo(identity, parsed.data, undefined, { simulatedPilot });
    return { redirectTo: parsed.data === "rider" ? "/ride" : "/pilot" };
  });
}
