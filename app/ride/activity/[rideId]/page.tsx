import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { requireUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { getReceipt } from "@/lib/services/history";
import { tripSearchParams } from "@/lib/trip-params";

import { ReceiptView } from "./ReceiptView";

export const metadata: Metadata = { title: "Receipt" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "11 · Receipt". Only the ride's own rider can open it. */
export default async function ReceiptPage({ params }: PageProps<"/ride/activity/[rideId]">) {
  const { rideId } = await params;
  const user = await requireUser(`/ride/activity/${rideId}`);
  if (!UUID.test(rideId)) notFound();
  const receipt = await getReceipt(user.id, rideId).catch((err: unknown) => {
    if (err instanceof AppError && err.code === "NOT_FOUND") return null;
    throw err;
  });
  if (!receipt) notFound();
  const again = `/ride/choose?${tripSearchParams(receipt.ride.pickup, receipt.ride.drop)}`;
  return (
    <AppFrame>
      <ReceiptView receipt={receipt} bookAgainHref={again} />
    </AppFrame>
  );
}
