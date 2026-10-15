import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { getSharedTrip } from "@/lib/services/share";

import { SharedTripView } from "./SharedTripView";

export const metadata: Metadata = {
  title: "Live trip",
  // A shared trip is private to whoever has the link.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** "6c · Shared trip link (web)". Public: the token is the only credential. */
export default async function SharedTripPage({ params }: PageProps<"/t/[token]">) {
  const { token } = await params;
  return (
    <AppFrame>
      <SharedTripView token={token} initial={await getSharedTrip(token)} />
    </AppFrame>
  );
}
