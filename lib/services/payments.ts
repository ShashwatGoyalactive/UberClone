import "server-only";

import { AppError } from "@/lib/errors";
import { log } from "@/lib/log";
import { formatRupees } from "@/lib/money";
import { broadcast } from "@/lib/realtime/broadcast";
import { EVENTS, topics } from "@/lib/realtime/topics";
import {
  findRideForParticipant,
  setUnpaidRideMethod,
  type RideWithPilot,
} from "@/lib/repositories/rides";
import { insertPayment, settleRide, walletBalance } from "@/lib/repositories/wallet";
import { announceBalance, requireGateway, type CheckoutOrder } from "@/lib/services/wallet";
import { MAX_CASH_OVER, type PaymentMethod } from "@/lib/wallet";

/**
 * Paying for a finished ride (docs/UX_FLOWS.md Flow 8):
 * - wallet: charged automatically when the trip ends;
 * - UPI or card: the rider pays through Razorpay Checkout (test mode);
 * - cash: the Pilot taps "Cash received", optionally crediting change
 *   to the rider's wallet.
 * The rider can switch method until the ride is paid. Every path ends in
 * comet_settle_ride, which settles a ride exactly once.
 */

const unpaid = (ride: RideWithPilot) =>
  ride.status === "completed" &&
  (ride.paymentStatus === "pending" || ride.paymentStatus === "failed");

async function announceRide(ride: { id: string; riderId: string; pilotId: string | null }) {
  await broadcast({
    topic: topics.ride(ride.id),
    event: EVENTS.rideUpdated,
    payload: { status: "completed" },
  });
  await announceBalance(ride.riderId);
}

/** Called once a trip completes: wallet rides are charged straight away. */
export async function chargeOnCompletion(ride: {
  id: string;
  riderId: string;
  pilotId: string | null;
  paymentMethod: string;
}) {
  if (ride.paymentMethod !== "wallet") return;
  const outcome = await settleRide(ride.id, "wallet");
  if (outcome === "insufficient") log.warn("payment.wallet_short", {});
  await announceRide(ride);
}

async function riderRide(riderId: string, rideId: string) {
  const ride = await findRideForParticipant(riderId, rideId);
  if (!ride || ride.riderId !== riderId)
    throw new AppError("NOT_FOUND", "That ride doesn't exist.");
  return ride;
}

/** The rider picks another way to pay a finished, unpaid ride. */
export async function chooseRidePayment(riderId: string, rideId: string, method: PaymentMethod) {
  const ride = await riderRide(riderId, rideId);
  if (!unpaid(ride)) throw new AppError("CONFLICT", "This ride is already paid.");

  if (method === "wallet") {
    const outcome = await settleRide(ride.id, "wallet");
    await announceRide(ride);
    if (outcome === "insufficient") {
      const balance = await walletBalance(riderId);
      throw new AppError(
        "INSUFFICIENT_BALANCE",
        `Your wallet has ${formatRupees(balance)}. Top up or choose another way to pay. No money was taken.`,
      );
    }
    if (outcome !== "paid" && outcome !== "already") {
      throw new AppError("CONFLICT", "This ride can't be paid right now.");
    }
    return;
  }

  if (!(await setUnpaidRideMethod(ride.id, method))) {
    throw new AppError("CONFLICT", "This ride is already paid.");
  }
  await announceRide(ride);
}

/** A Razorpay order for the ride's total, for the rider's UPI or card payment. */
export async function createRidePaymentOrder(
  riderId: string,
  rideId: string,
): Promise<CheckoutOrder> {
  const ride = await riderRide(riderId, rideId);
  if (!unpaid(ride)) throw new AppError("CONFLICT", "This ride is already paid.");
  if (ride.paymentMethod !== "upi" && ride.paymentMethod !== "card") {
    await setUnpaidRideMethod(ride.id, "upi");
  }
  const g = requireGateway();
  const { orderId } = await g.createOrder({
    amountPaise: ride.totalPaise,
    receipt: `ride_${ride.id.slice(0, 8)}`,
    notes: { purpose: "ride", rideId: ride.id },
  });
  await insertPayment({
    userId: riderId,
    purpose: "ride",
    rideId: ride.id,
    amountPaise: ride.totalPaise,
    razorpayOrderId: orderId,
  });
  log.info("payment.created", { purpose: "ride", gateway: g.kind });
  return { orderId, keyId: g.keyId, amountPaise: ride.totalPaise, gateway: g.kind };
}

/**
 * "Cash received" (docs/API.md confirmCashPayment). The Pilot records
 * what the rider handed over; with creditChangeToWallet the difference
 * goes to the rider's wallet instead of being handed back in coins.
 */
export async function confirmCashPayment(
  pilotId: string,
  rideId: string,
  receivedPaise: number,
  creditChangeToWallet: boolean,
) {
  const ride = await findRideForParticipant(pilotId, rideId);
  if (!ride || ride.pilotId !== pilotId)
    throw new AppError("NOT_FOUND", "That ride doesn't exist.");
  if (!unpaid(ride)) throw new AppError("CONFLICT", "This ride is already paid.");
  if (receivedPaise < ride.totalPaise) {
    throw new AppError(
      "VALIDATION",
      `The fare is ${formatRupees(ride.totalPaise)}. Collect at least that.`,
    );
  }
  if (receivedPaise > ride.totalPaise + MAX_CASH_OVER) {
    throw new AppError(
      "VALIDATION",
      `That's more than ${formatRupees(MAX_CASH_OVER)} over the fare. Check the amount.`,
    );
  }
  const change = creditChangeToWallet ? receivedPaise - ride.totalPaise : 0;
  const outcome = await settleRide(ride.id, "cash", change);
  if (outcome === "already") throw new AppError("CONFLICT", "This ride is already paid.");
  if (outcome !== "paid") throw new AppError("CONFLICT", "This ride can't be paid right now.");
  log.info("payment.cash_received", { changeCredited: change > 0 });
  await announceRide(ride);
  return { changeCreditedPaise: change };
}
