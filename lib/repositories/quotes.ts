import "server-only";

import type { FareQuote, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/** Fare quotes, always scoped to the rider who asked for them. */

export async function insertQuote(data: Prisma.FareQuoteUncheckedCreateInput): Promise<FareQuote> {
  return db.fareQuote.create({ data });
}

/** A quote only its own rider can load; anyone else gets null. */
export async function findQuoteForRider(
  riderId: string,
  quoteId: string,
): Promise<FareQuote | null> {
  return db.fareQuote.findFirst({ where: { id: quoteId, riderId } });
}
