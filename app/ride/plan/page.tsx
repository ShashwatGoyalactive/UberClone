import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { requireUser } from "@/lib/auth/session";

import { PlanForm } from "./PlanForm";

export const metadata: Metadata = { title: "Plan your ride" };

export default async function PlanPage() {
  await requireUser("/ride/plan");
  return (
    <AppFrame>
      <PlanForm />
    </AppFrame>
  );
}
