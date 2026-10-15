import { History, Home, User, Wallet } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/** Bottom navigation for the rider app (docs/DESIGN_SYSTEM.md §11). */

const TABS = [
  { href: "/ride", label: "Home", Icon: Home },
  { href: "/ride/activity", label: "Activity", Icon: History },
  { href: "/ride/wallet", label: "Wallet", Icon: Wallet },
  { href: "/ride/account", label: "Account", Icon: User },
] as const;

export function RiderTabBar({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav
      aria-label="Main"
      className="grid grid-cols-4 border-t border-border px-2 pt-2 pb-4 md:hidden"
    >
      {TABS.map(({ href, label, Icon }) => {
        const on = href === active;
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 rounded-sm p-1.5 text-xs",
              on ? "font-bold text-brand-text" : "font-semibold text-muted-foreground",
            )}
          >
            <Icon className="size-[22px]" aria-hidden strokeWidth={on ? 2.2 : 2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
