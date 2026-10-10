"""
Dataset builder for the FleetOps vehicle recommender.

Produces pointwise (request, vehicle) pairs with a binary label:
  1 = the vehicle the request chose (gated examples only)
  0 = every other candidate vehicle for that request

CUSTOMER DATA ONLY ARRIVES VIA THE GATE: training/gate.py validates and
classifies raw behavior into api/model/gated_examples.json. This module never
reads reservations or recommendation_logs directly - that is the whole point
of the gate (never assume a customer's choice is correct until validated).

Feature computation here MUST stay in sync with `ai_features()` in
api/ai_assistant.php - the exported model only works if both compute the
same numbers.

Synthetic requests (policy-shaped, no customer data) may be added on top for
coverage; they carry the house preference policy, not observed behavior.
"""

from __future__ import annotations

import json
import os
import random
import re
from dataclasses import dataclass

# Mirror of the PHP side (luggage request size -> required piece count).
LUGGAGE_REQUIRED = {"small": 2, "medium": 4, "large": 6}
LUGGAGE_CAPACITY_BY_TYPE = {"AUV": 4, "SEDAN": 3, "L300": 12}

# Mirror of ai_seat_band() in api/ai_assistant.php: the smallest seating
# class ceiling (in seats) that can hold the party. Beyond the largest
# ceiling no cap applies.
SEAT_BAND_CEILINGS = (5, 8, 12, 15, 18)


def seat_band_ceiling(passengers: int) -> int | None:
    if passengers <= 0:
        return None
    for ceiling in SEAT_BAND_CEILINGS:
        if passengers <= ceiling:
            return ceiling
    return None


FEATURES = [
    "seat_sufficient",
    "seat_gap",
    "seat_class_match",
    "type_match",
    "within_budget",
    "relative_cost",
    "budget_utilization",
    "luggage_margin",
    "year_norm",
]


@dataclass
class Vehicle:
    vehicle_id: int
    vehicle_type: str
    seats: int
    luggage_capacity: int
    daily_rate: float
    year: int
    status: str = "available"


@dataclass
class Request:
    """One customer request; every vehicle is scored against it."""

    passengers: int
    days: int
    budget: float | None
    luggage_size: str | None
    preferred_type: str | None
    chosen_vehicle_id: int | None = None  # label (gated examples only)
    source: str = "synthetic"
    weight: float = 1.0  # sample weight: gate decides (human-approved = 0.5)


# ---------------------------------------------------------------------------
# Gated examples (the ONLY customer-derived input; produced by training/gate.py)
# ---------------------------------------------------------------------------

TRAINING_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(TRAINING_DIR)
CONFIG_PHP = os.path.join(PROJECT_DIR, "api", "config.php")
GATED_EXAMPLES = os.path.join(PROJECT_DIR, "api", "model", "gated_examples.json")


def request_from_example(ex: dict) -> Request:
    return Request(
        passengers=max(0, int(ex.get("passengers") or 0)),
        days=max(1, int(ex.get("days") or 1)),
        budget=float(ex["budget"]) if ex.get("budget") is not None else None,
        luggage_size=ex.get("luggage_size"),
        preferred_type=ex.get("preferred_type"),
        chosen_vehicle_id=int(ex["chosen_vehicle_id"]) if ex.get("chosen_vehicle_id") else None,
        source=str(ex.get("source", "gated")),
        weight=float(ex.get("weight", 1.0)),
    )


def load_gated_examples(path: str = GATED_EXAMPLES) -> tuple[list[Request], dict]:
    """Fail-closed: a missing gate export is an error, never a silent pass."""
    if not os.path.isfile(path):
        raise SystemExit(
            "[dataset] Gate export missing: " + path + "\n"
            "[dataset] Run first:  python training/gate.py   (then retrain)"
        )
    with open(path, "r", encoding="utf-8") as fh:
        payload = json.load(fh)
    examples = [request_from_example(e) for e in payload.get("examples", [])]
    examples = [r for r in examples if r.chosen_vehicle_id is not None]
    counts = {
        "gated_generated_at": payload.get("generated_at"),
        "log": sum(1 for r in examples if r.source == "log"),
        "reservation": sum(1 for r in examples if r.source == "reservation"),
    }
    return examples, counts


# ---------------------------------------------------------------------------
# Fleet loading
# ---------------------------------------------------------------------------

def _read_db_config() -> dict:
    with open(CONFIG_PHP, "r", encoding="utf-8") as fh:
        text = fh.read()
    cfg = {}
    for key in ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASS"):
        m = re.search(rf"define\(\s*'{key}'\s*,\s*'([^']*)'\s*\)", text)
        if m:
            cfg[key] = m.group(1)
    return cfg


def load_fleet_from_db() -> list[Vehicle] | None:
    """Returns the live fleet, or None when MySQL is unreachable."""
    try:
        import pymysql  # noqa: PLC0415
    except ImportError:
        return None
    try:
        cfg = _read_db_config()
        conn = pymysql.connect(
            host=cfg.get("DB_HOST", "localhost"),
            database=cfg.get("DB_NAME", "fleetops_db"),
            user=cfg.get("DB_USER", "root"),
            password=cfg.get("DB_PASS", ""),
            connect_timeout=3,
            read_timeout=10,
        )
    except Exception as exc:  # noqa: BLE001 - any connection problem = no DB
        print(f"[dataset] MySQL unavailable ({exc.__class__.__name__}); using fallback fleet.")
        return None

    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT vehicle_id, vehicle_type, seats, COALESCE(luggage_capacity, 0), "
                "daily_rate, year, status FROM vehicles"
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    fleet = [
        Vehicle(
            vehicle_id=int(r[0]),
            vehicle_type=str(r[1]),
            seats=int(r[2]),
            luggage_capacity=int(r[3]) or LUGGAGE_CAPACITY_BY_TYPE.get(str(r[1]), 4),
            daily_rate=float(r[4]),
            year=int(r[5]),
            status=str(r[6]),
        )
        for r in rows
    ]
    print(f"[dataset] Loaded {len(fleet)} vehicles from MySQL.")
    return fleet


FALLBACK_FLEET = [
    Vehicle(1, "AUV", 5, 4, 2200, 2021),
    Vehicle(2, "AUV", 7, 4, 2500, 2021),
    Vehicle(3, "AUV", 5, 4, 2300, 2022),
    Vehicle(4, "AUV", 7, 5, 2600, 2020),
    Vehicle(5, "SEDAN", 5, 3, 3200, 2022),
    Vehicle(6, "SEDAN", 5, 3, 3500, 2023),
    Vehicle(7, "SEDAN", 5, 3, 3000, 2019),
    Vehicle(8, "SEDAN", 5, 3, 3800, 2023),
    Vehicle(9, "L300", 12, 12, 4500, 2021),
    Vehicle(10, "L300", 15, 14, 5200, 2022),
    Vehicle(11, "L300", 12, 12, 4200, 2018),
    Vehicle(12, "AUV", 4, 3, 1900, 2017),
    Vehicle(13, "SEDAN", 4, 3, 2900, 2020),
    Vehicle(14, "L300", 18, 16, 6000, 2024),
    Vehicle(15, "AUV", 6, 4, 2400, 2024),
    Vehicle(16, "SEDAN", 5, 3, 3400, 2021),
]


# ---------------------------------------------------------------------------
# Features (byte-for-byte the same math as api/ai_assistant.php)
# ---------------------------------------------------------------------------

def fleet_stats(fleet: list[Vehicle]) -> float:
    return max([v.daily_rate for v in fleet] + [1.0])


def compute_features(vehicle: Vehicle, req: Request, max_rate: float) -> dict:
    seats = vehicle.seats
    cap = vehicle.luggage_capacity
    rate = vehicle.daily_rate
    p = req.passengers

    band = seat_band_ceiling(p)
    # Absolute extra seats beyond the party (capped at 10): a 12-seater for
    # 2 people scores 1.0 while a 5-seater scores 0.3.
    gap = max(0.0, min(1.0, (seats - p) / 10.0)) if p > 0 else 0.35
    if p <= 0 or band is None:
        class_match = 0.5  # no party size -> no right-size band to match
    else:
        class_match = 1.0 if seats <= band else 0.0

    if req.budget is not None and req.budget > 0:
        util = max(0.0, min(1.5, (rate * req.days) / req.budget)) / 1.5
    else:
        util = 0.5

    required = LUGGAGE_REQUIRED.get(req.luggage_size or "", 0)
    if required > 0 and cap > 0:
        margin = max(0.0, min(1.0, (cap - required) / max(cap, 1)))
    else:
        margin = 0.5

    return {
        "seat_sufficient": 1.0 if (p <= 0 or seats >= p) else 0.0,
        "seat_gap": gap,
        "seat_class_match": class_match,
        "type_match": 0.5 if req.preferred_type is None else (1.0 if req.preferred_type == vehicle.vehicle_type else 0.0),
        "within_budget": 1.0 if (req.budget is None or rate * req.days <= req.budget) else 0.0,
        "relative_cost": min(2.0, rate / max_rate),
        "budget_utilization": util,
        "luggage_margin": margin,
        "year_norm": max(0.0, min(1.0, (vehicle.year - 2010) / 15)),
    }


# ---------------------------------------------------------------------------
# Synthetic requests + preference labels
# ---------------------------------------------------------------------------

def _hard_feasible(vehicle: Vehicle, req: Request) -> bool:
    if req.passengers > 0 and vehicle.seats < req.passengers:
        return False
    required = LUGGAGE_REQUIRED.get(req.luggage_size or "", 0)
    if required > 0 and vehicle.luggage_capacity < required:
        return False
    if req.budget is not None and vehicle.daily_rate * req.days > req.budget:
        return False
    return True


def _preference_utility(vehicle: Vehicle, req: Request, max_rate: float) -> float:
    """How much a customer would like this vehicle (labels for synthetic rows)."""
    f = compute_features(vehicle, req, max_rate)
    right_size = 1.0 - f["seat_gap"]          # tightest fit beats a big cheap van
    cheap = 1.0 - min(1.0, f["relative_cost"])  # cheaper is better
    return (
        3.0 * right_size                       # dominant: never oversize for a small party
        + 1.0 * f["seat_class_match"]          # bonus when inside the right-size band
        + 1.6 * f["type_match"]                # honor an explicit type preference
        + 1.0 * cheap
        + 0.8 * f["luggage_margin"]
        + random.uniform(0.0, 0.15)            # irreducible personal taste
    )


def make_synthetic_requests(fleet: list[Vehicle], count: int, seed: int = 42) -> list[Request]:
    rng = random.Random(seed)
    max_rate = fleet_stats(fleet)
    sizes = [None, "small", "medium", "large"]
    types = [None, None, "AUV", "SEDAN", "L300"]  # often no preference
    out: list[Request] = []

    for _ in range(count):
        for _attempt in range(8):
            passengers = rng.choice([1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14])
            luggage = rng.choice(sizes)
            pref = rng.choice(types)
            days = rng.choice([1, 1, 2, 3, 5, 7, 14])
            feasible = [v for v in fleet if _hard_feasible(
                v, Request(passengers, days, None, luggage, pref)
            )]
            if not feasible:
                # Relax the request until something fits (mirrors "at least one candidate").
                passengers = min(passengers, max(v.seats for v in fleet))
                luggage = None
                feasible = [v for v in fleet if _hard_feasible(
                    v, Request(passengers, days, None, luggage, pref)
                )]
            if not feasible:
                continue

            # Budget relative to what the customer prefers: keeps preference and
            # budget both able to shape the label (a budget derived from the
            # cheapest car of any type would otherwise erase the type signal).
            pool = [v for v in feasible if pref is None or v.vehicle_type == pref] or feasible
            cheapest = min(v.daily_rate for v in pool) * days
            # Budgets range from tight (covers the cheapest matching option) to generous.
            budget = round(cheapest * rng.uniform(1.0, 1.9), 2)
            req = Request(passengers, days, budget, luggage, pref, source="synthetic")

            priced = [v for v in fleet if _hard_feasible(v, req)] or feasible
            best = max(
                priced,
                key=lambda v: _preference_utility(v, req, max_rate),
            )
            req.chosen_vehicle_id = best.vehicle_id
            out.append(req)
            break
    return out


# ---------------------------------------------------------------------------
# Pair building
# ---------------------------------------------------------------------------

def build_pairs(requests: list[Request], fleet: list[Vehicle]):
    """Returns (rows, labels, group_ids, sample_weights).

    Every pair of a request carries that request's gate-assigned weight, so a
    half-trusted (human-approved) example contributes proportionally less.
    """
    max_rate = fleet_stats(fleet)
    by_id = {v.vehicle_id: v for v in fleet}
    rows, labels, groups, weights = [], [], [], []
    dropped = 0

    for gid, req in enumerate(requests):
        if req.chosen_vehicle_id not in by_id:
            dropped += 1
            continue
        for vehicle in fleet:
            rows.append(compute_features(vehicle, req, max_rate))
            labels.append(1 if vehicle.vehicle_id == req.chosen_vehicle_id else 0)
            groups.append(gid)
            weights.append(float(req.weight))

    if dropped:
        print(f"[dataset] Skipped {dropped} request(s) whose chosen vehicle no longer exists.")
    return rows, labels, groups, weights


def full_dataset(synthetic_count: int = 3000, seed: int = 42, use_gated: bool = True):
    """Gated customer examples + policy-shaped synthetic coverage.

    use_gated=False is an explicit SYNTHETIC-ONLY mode (development); it never
    happens implicitly - a missing gate export is a hard error otherwise.
    """
    fleet = load_fleet_from_db()
    if not fleet:
        print("[dataset] Using the built-in demo fleet (16 vehicles).")
        fleet = FALLBACK_FLEET

    if use_gated:
        gated, gated_counts = load_gated_examples()
        print(
            f"[dataset] Gated examples: {len(gated)} "
            f"(log={gated_counts['log']}, reservation={gated_counts['reservation']} "
            f"from {gated_counts['gated_generated_at']})"
        )
    else:
        gated, gated_counts = [], {"log": 0, "reservation": 0, "gated_generated_at": None}
        print("[dataset] SYNTHETIC-ONLY mode: no customer data will be used.")

    synthetic = make_synthetic_requests(fleet, synthetic_count, seed=seed) if synthetic_count else []
    requests = gated + synthetic
    if not requests:
        raise SystemExit("[dataset] No training requests were produced.")

    rows, labels, groups, weights = build_pairs(requests, fleet)
    counts = {
        "gated": len(gated),
        "gated_log": gated_counts["log"],
        "gated_reservation": gated_counts["reservation"],
        "gated_generated_at": gated_counts["gated_generated_at"],
        "synthetic": len(synthetic),
    }
    print(
        f"[dataset] {len(requests)} requests "
        f"({len(gated)} gated + {len(synthetic)} synthetic) -> {len(rows)} pairs, "
        f"{sum(labels)} positives."
    )
    return rows, labels, groups, weights, counts
