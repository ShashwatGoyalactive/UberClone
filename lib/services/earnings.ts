import "server-only";

import { db } from "@/lib/db";
import type { RideTier } from "@/lib/fares";
import { getWallet, type WalletView } from "@/lib/services/wallet";

/**
 * "6 · Earnings & payout": what a Pilot made over the last seven days, by
 * day in India time, plus their Pilot wallet. A trip's earning is the fare
 * plus any waiting fee, minus Comet's 15% (comet_settle_ride).
 */

export type EarningsDay = { date: string; earnedPaise: number; trips: number };

export type EarningsView = {
  days: EarningsDay[];
  weekPaise: number;
  weekTrips: number;
  rating: number | null;
  wallet: WalletView;
  recentTrips: {
    id: string;
    pickup: string;
    drop: string;
    tier: RideTier;
    completedAt: string;
    earnedPaise: number;
    paymentMethod: string;
    paymentStatus: string;
  }[];
};

const TZ = "Asia/Kolkata";

/** "2026-10-11" for the calendar day in India at this instant. */
export function indiaDate(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(at);
}

export async function getEarnings(pilotId: string, now: Date = new Date()): Promise<EarningsView> {
  const dates = Array.from({ length: 7 }, (_, i) =>
    indiaDate(new Date(now.getTime() - (6 - i) * 86_400_000)),
  );

  const [byDay, recent, profile, wallet] = await Promise.all([
    db.$queryRaw<{ day: string; earned: number; trips: number }[]>`
      SELECT to_char(completed_at AT TIME ZONE ${TZ}, 'YYYY-MM-DD') AS day,
             SUM(fare_paise + waiting_fee_paise - platform_fee_paise)::integer AS earned,
             COUNT(*)::integer AS trips
      FROM rides
      WHERE pilot_id = ${pilotId}::uuid AND status = 'completed'
        AND completed_at >= ${new Date(now.getTime() - 8 * 86_400_000)}
      GROUP BY 1`,
    db.ride.findMany({
      where: { pilotId, status: "completed" },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
    db.pilotProfile.findUnique({ where: { userId: pilotId }, select: { ratingAvg: true } }),
    getWallet(pilotId, 10),
  ]);

  const found = new Map(byDay.map((d) => [d.day, d]));
  const days = dates.map((date) => ({
    date,
    earnedPaise: found.get(date)?.earned ?? 0,
    trips: found.get(date)?.trips ?? 0,
  }));

  return {
    days,
    weekPaise: days.reduce((sum, d) => sum + d.earnedPaise, 0),
    weekTrips: days.reduce((sum, d) => sum + d.trips, 0),
    rating: profile?.ratingAvg ? Number(profile.ratingAvg) : null,
    wallet,
    recentTrips: recent.map((r) => ({
      id: r.id,
      pickup: r.pickupAddress,
      drop: r.dropAddress,
      tier: r.tier as RideTier,
      completedAt: (r.completedAt ?? r.updatedAt).toISOString(),
      earnedPaise: r.farePaise + r.waitingFeePaise - r.platformFeePaise,
      paymentMethod: r.paymentMethod,
      paymentStatus: r.paymentStatus,
    })),
  };
}
