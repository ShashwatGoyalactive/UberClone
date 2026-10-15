import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth/session";

import { PlanForm } from "./PlanForm";

export const metadata: Metadata = { title: "Plan your ride" };

export default async function PlanPage() {
  const user = await requireUser("/ride/plan");
  return (
    <AppShell app="rider" active="/ride" layout="page" initial={user.displayName[0]}>
      <PlanForm />
    </AppShell>
  );
}
