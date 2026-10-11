import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { requireUser } from "@/lib/auth/session";
import { safeReturnPath } from "@/lib/redirects";
import { getWallet } from "@/lib/services/wallet";

import { WalletScreen } from "./WalletScreen";

export const metadata: Metadata = { title: "Wallet" };

/** "8 · Wallet": balance, Add money and transactions. */
export default async function WalletPage({ searchParams }: PageProps<"/ride/wallet">) {
  const user = await requireUser("/ride/wallet");
  const { return: back } = await searchParams;
  const returnTo = typeof back === "string" ? safeReturnPath(back, "") : "";
  return (
    <AppFrame>
      <WalletScreen
        userId={user.id}
        initial={await getWallet(user.id)}
        returnTo={returnTo || null}
      />
    </AppFrame>
  );
}
