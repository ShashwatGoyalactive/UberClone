import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { requireUser } from "@/lib/auth/session";
import { findPilotProfile } from "@/lib/repositories/pilots";
import { getEarnings } from "@/lib/services/earnings";

import { EarningsScreen } from "./EarningsScreen";

export const metadata: Metadata = { title: "Earnings" };

/** "6 · Earnings & payout". */
export default async function EarningsPage() {
  const user = await requireUser("/pilot/earnings");
  if (!(await findPilotProfile(user.id))) redirect("/pilot");
  return (
    <AppFrame>
      <EarningsScreen initial={await getEarnings(user.id)} cometId={user.cometId} />
    </AppFrame>
  );
}
