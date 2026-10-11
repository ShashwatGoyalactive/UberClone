"use client";

import { ArrowLeft, LocateFixed, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import type { Place } from "@/lib/mapbox/types";
import { tripSearchParams } from "@/lib/trip-params";
import { useCurrentPosition } from "@/lib/use-current-position";

import { searchPlacesAction } from "../actions";

const DEBOUNCE_MS = 250;

/** "3 · Plan ride": pickup from location, destination by search. */
export function PlanForm() {
  const router = useRouter();
  const position = useCurrentPosition();
  const [query, setQuery] = useState("");
  // Results are kept with the query that produced them, so a short or
  // changed query simply hides stale results instead of resetting state.
  const [found, setFound] = useState<{ query: string; places: Place[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);

  const trimmed = query.trim();
  const tooShort = trimmed.length < 3;
  const results = !tooShort && found?.query === trimmed ? found.places : [];
  const searched = !tooShort && found?.query === trimmed;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await searchPlacesAction({ query: q, near: position.position });
        // Ignore answers to queries the rider has already typed past.
        if (ticket !== latest.current) return;
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setError(null);
        setFound({ query: q, places: result.data });
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, position.position]);

  function choose(place: Place) {
    const pickup = {
      address: position.status === "ok" ? "Current location" : "HSR Layout, Bengaluru",
      point: position.position,
    };
    router.push(
      `/ride/choose?${tripSearchParams(pickup, { address: place.name, point: place.point })}`,
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-card">
      <div className="flex flex-col gap-4 border-b border-border px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/ride"
            aria-label="Back"
            className="flex size-11 items-center justify-center rounded-full bg-muted"
          >
            <ArrowLeft className="size-[22px]" aria-hidden strokeWidth={2.2} />
          </Link>
          <h1 className="font-heading text-[22px] font-bold tracking-tight">Plan your ride</h1>
        </div>

        <div className="flex items-stretch gap-3">
          <div className="flex w-5 flex-col items-center py-[22px]" aria-hidden>
            <span className="size-3 rounded-full border-[3px] border-info" />
            <span className="my-1 w-0.5 flex-1 bg-border" />
            <span className="size-3 rounded-[3px] bg-foreground" />
          </div>
          <div className="flex flex-1 flex-col gap-2.5">
            <div className="flex h-[52px] items-center gap-2 rounded-md bg-muted px-4 text-base font-medium">
              <LocateFixed className="size-4 text-info" aria-hidden />
              {position.status === "locating"
                ? "Finding your location…"
                : position.status === "ok"
                  ? "Current location"
                  : "HSR Layout, Bengaluru"}
            </div>
            <label htmlFor="destination" className="sr-only">
              Destination
            </label>
            <Input
              id="destination"
              autoFocus
              autoComplete="off"
              placeholder="Where to?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-[52px] rounded-md border-2 border-primary bg-card px-4 text-base font-medium"
            />
          </div>
        </div>
        {position.status === "fallback" && (
          <p className="text-xs text-muted-foreground">
            {position.reason === "outside"
              ? "Comet runs in Bengaluru, so trips start from HSR Layout for now."
              : "Location is off, so trips start from HSR Layout. You can turn location on in your browser."}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5" aria-live="polite" aria-busy={pending}>
        {error && (
          <p role="alert" className="py-4 text-sm font-semibold text-danger-text">
            {error}
          </p>
        )}
        {results.map((place) => (
          <button
            key={place.id}
            type="button"
            onClick={() => choose(place)}
            className="flex items-center gap-3.5 border-b border-border py-3.5 text-left"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <MapPin className="size-[18px]" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-semibold">{place.name}</span>
              <span className="truncate text-sm text-muted-foreground">{place.address}</span>
            </span>
          </button>
        ))}
        {searched && results.length === 0 && !pending && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No places found. Try a landmark or area name.
          </p>
        )}
        {!searched && query.trim().length < 3 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Type at least 3 letters to search.
          </p>
        )}
      </div>
    </div>
  );
}
