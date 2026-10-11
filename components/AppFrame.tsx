/**
 * The phone-width column the rider and Pilot apps live in. On wider
 * screens it stays 430px and centred, so desktop visitors see the phone
 * layout the design was drawn for (docs/DESIGN_SYSTEM.md §14).
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-background sm:shadow-float">
      {children}
    </div>
  );
}
