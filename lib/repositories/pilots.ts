import "server-only";

import type { PilotProfile } from "@prisma/client";

import { db } from "@/lib/db";

/** The acting user's own Pilot profile, if they have one. */
export async function findPilotProfile(userId: string): Promise<PilotProfile | null> {
  return db.pilotProfile.findUnique({ where: { userId } });
}
