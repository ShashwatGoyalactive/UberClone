import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
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
    <AppShell app="pilot" active="/pilot/earnings" layout="page" initial={user.displayName[0]}>
      <EarningsScreen initial={await getEarnings(user.id)} cometId={user.cometId} />
    </AppShell>
  );
}
