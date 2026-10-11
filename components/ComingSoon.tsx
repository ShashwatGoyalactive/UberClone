import { Construction } from "lucide-react";

/** Placeholder for tabs whose feature lands in a later build phase. */
export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
      <Construction className="size-12 text-muted-foreground" aria-hidden strokeWidth={1.6} />
      <h1 className="font-heading text-xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">Arrives with {phase}.</p>
    </main>
  );
}
