import { ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

/** A row on the account page leading to a safety setting. */
export function SafetyLink({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg bg-card p-4">
      <ShieldCheck className="size-5 text-brand-text" aria-hidden />
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="font-bold">{title}</span>
        <span className="text-[13px] text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
    </Link>
  );
}
