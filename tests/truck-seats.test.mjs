import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCapacityReport,
  decoratePickupWithCapacity,
  ensureTruckSeats,
  estimateLoadDemand,
  markPickupTerminal,
  occupiedSeatCount,
  pickSeatForLoad,
  planSeatLimit,
} from "../functions/lib/truck-seats.js";

function driver(overrides = {}) {
  return {
    userId: "usr_driver",
    paymentStatus: "paid_driver",
    type: "Independent driver / self-insured - $29.99/mo",
    equipmentType: "26 ft Box",
    activePickups: [],
    truckSeats: [],
    ...overrides,
  };
}

test("plan seat limits match pricing tiers", () => {
  assert.equal(planSeatLimit({ paymentStatus: "paid_driver" }), 1);
  assert.equal(planSeatLimit({ paymentStatus: "paid_fleet_starter" }), 3);
  assert.equal(planSeatLimit({ paymentStatus: "paid_fleet_growth" }), 7);
  assert.equal(planSeatLimit({ paymentStatus: "paid_fleet_pro" }), 12);
  assert.equal(planSeatLimit({ paymentStatus: "paid_shipper" }), 0);
});

test("default seats are capped to the paid plan", () => {
  const seats = ensureTruckSeats(driver());
  assert.equal(seats.length, 1);
  assert.equal(seats[0].usableLengthFt, 26);
  const fleet = ensureTruckSeats(
    driver({ paymentStatus: "paid_fleet_starter", type: "Broker 1–3 trucks - $59.99/mo" }),
  );
  assert.equal(fleet.length, 3);
});

test("a $29.99 driver can stack two partials on one seat when space remains", () => {
  const account = driver();
  const partialA = {
    id: "load-a",
    from: "Dallas, TX",
    to: "Fort Worth, TX",
    eq: "26 ft Box",
    wt: "2000 lbs",
    dimensions: "48x40x48 in",
    commodity: "partial pallets",
  };
  const first = pickSeatForLoad(account, partialA);
  assert.equal(first.ok, true, JSON.stringify(first));
  const pickup1 = decoratePickupWithCapacity(
    {
      id: "load-a",
      loadId: "load-a",
      status: "Confirmed",
      serverAuthorized: true,
    },
    first.seat,
    first.demand,
  );
  account.activePickups = [pickup1];
  account.truckSeats = ensureTruckSeats(account);

  const partialB = {
    id: "load-b",
    from: "Fort Worth, TX",
    to: "Arlington, TX",
    eq: "26 ft Box",
    wt: "1500 lbs",
    dimensions: "48x40x40 in",
    commodity: "partial",
  };
  const second = pickSeatForLoad(account, partialB, first.seat.seatId);
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(second.seat.seatId, first.seat.seatId);
  assert.equal(occupiedSeatCount(account), 1);
});

test("a full exclusive load blocks stacking on the same seat", () => {
  const account = driver();
  const full = {
    id: "load-full",
    from: "Dallas, TX",
    to: "Houston, TX",
    eq: "26 ft Box",
    wt: "9000 lbs",
    commodity: "full exclusive truck",
    exclusiveTruck: true,
  };
  const first = pickSeatForLoad(account, full);
  assert.equal(first.ok, true);
  account.activePickups = [
    decoratePickupWithCapacity(
      {
        id: "load-full",
        loadId: "load-full",
        status: "Confirmed",
        serverAuthorized: true,
      },
      first.seat,
      first.demand,
    ),
  ];
  const partial = {
    id: "load-p",
    from: "Houston, TX",
    to: "Austin, TX",
    eq: "26 ft Box",
    wt: "500 lbs",
    commodity: "partial",
  };
  const second = pickSeatForLoad(account, partial);
  assert.equal(second.ok, false);
  assert.ok(
    second.reason === "capacity_full" || second.reason === "plan_concurrency_limit",
    JSON.stringify(second),
  );
});

test("completing a pickup frees seat capacity for the next load", () => {
  const account = driver();
  const load = {
    id: "load-1",
    from: "A",
    to: "B",
    eq: "26 ft Box",
    wt: "8000 lbs",
    commodity: "full",
  };
  const pick = pickSeatForLoad(account, load);
  account.activePickups = [
    decoratePickupWithCapacity(
      {
        id: "load-1",
        loadId: "load-1",
        status: "Confirmed",
        serverAuthorized: true,
      },
      pick.seat,
      pick.demand,
    ),
  ];
  assert.equal(occupiedSeatCount(account), 1);
  const freed = markPickupTerminal(account, "load-1", "Delivered");
  assert.equal(occupiedSeatCount(freed), 0);
  const next = pickSeatForLoad(freed, {
    id: "load-2",
    from: "B",
    to: "C",
    eq: "26 ft Box",
    wt: "1000 lbs",
    commodity: "partial",
  });
  assert.equal(next.ok, true, JSON.stringify(next));
});

test("capacity report summarizes used and remaining feet", () => {
  const account = driver();
  const demand = estimateLoadDemand({
    eq: "26 ft Box",
    wt: "2000 lbs",
    dimensions: "96x48x48 in",
    commodity: "partial",
  });
  const seats = ensureTruckSeats(account);
  account.truckSeats = seats;
  account.activePickups = [
    decoratePickupWithCapacity(
      {
        id: "load-a",
        loadId: "load-a",
        status: "Confirmed",
        serverAuthorized: true,
      },
      seats[0],
      demand,
    ),
  ];
  const report = buildCapacityReport(account);
  assert.equal(report.planLimit, 1);
  assert.equal(report.occupiedSeats, 1);
  assert.equal(report.seats[0].status, "partial");
  assert.ok(report.seats[0].remaining.lengthFt < report.seats[0].usableLengthFt);
});
