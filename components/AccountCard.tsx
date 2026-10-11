import type { User } from "@prisma/client";

import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

import { CopyCometId } from "./CopyCometId";

/**
 * The signed-in account with its Comet ID. A stand-in for the real home
 * screens until the map and booking land (phases 3–4); it proves the
 * session, the account row and the Comet ID end to end.
 */
export function AccountCard({ user, roleLabel }: { user: User; roleLabel: string }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-ink p-5 text-on-ink">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold tracking-widest text-ink-muted uppercase">
            {roleLabel}
            {user.isDemo && " · demo"}
          </span>
          <span className="font-heading text-xl font-bold">{user.displayName}</span>
        </div>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="h-10 rounded-sm bg-ink-raised px-3 text-on-ink hover:bg-ink-hover hover:text-on-ink"
          >
            Sign out
          </Button>
        </form>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold tracking-widest text-ink-muted uppercase">
          Your Comet ID
        </span>
        <div className="flex items-center gap-3">
          <span
            className="font-heading text-2xl font-bold tracking-[0.12em] text-ink-accent"
            data-testid="comet-id"
          >
            {user.cometId}
          </span>
          <CopyCometId cometId={user.cometId} />
        </div>
        <span className="text-sm leading-snug text-ink-muted">
          Permanent and unique to you. Use it for support, referrals and verified rides.
        </span>
      </div>
    </section>
  );
}
