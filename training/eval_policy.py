"""
Policy regression suite - safety gate E2 for the vehicle ranker.

    from eval_policy import run_suite
    report = run_suite(candidate_payload)   # report["all_pass"] must be True

Fixtures encode HOUSE POLICY (correctness), never customer behavior:
  * only feasible vehicles can ever be recommended (seats, luggage, budget)
  * never oversize: a right-size (<= band ceiling) vehicle beats larger ones
  * leanest fit first, stated type breaks equal-seat ties, price next
  * seat_sufficient / within_budget strictly increase the learned score

Customer choices play no role here - a candidate trained on gated data can
still fail if it learned something that violates these invariants. 100% pass
is required before training/retrain.py may deploy.
"""

from __future__ import annotations

import sys
import os

import numpy as np

TRAINING_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TRAINING_DIR)

from dataset import (  # noqa: E402
    FALLBACK_FLEET,
    LUGGAGE_REQUIRED,
    Request,
    Vehicle,
    compute_features,
    fleet_stats,
    seat_band_ceiling,
)
from train import scores_from_payload  # noqa: E402


# ---------------------------------------------------------------------------
# Serving mirror (request-only path of api/ai_assistant.php)
# ---------------------------------------------------------------------------

def hard_filter(fleet: list[Vehicle], req: Request) -> list[Vehicle]:
    out = []
    for v in fleet:
        if v.status != "available":
            continue
        if req.passengers > 0 and v.seats < req.passengers:
            continue
        required = LUGGAGE_REQUIRED.get(req.luggage_size or "", 0)
        if required > 0 and v.luggage_capacity < required:
            continue
        if req.budget is not None and v.daily_rate * req.days > req.budget:
            continue
        out.append(v)
    return out


def band_pool(fleet: list[Vehicle], req: Request) -> list[Vehicle]:
    """Right-size restriction: rank within the seat band when it applies."""
    band = seat_band_ceiling(req.passengers)
    if not fleet or req.passengers <= 0 or band is None:
        return fleet
    in_band = [v for v in fleet if v.seats <= band]
    return in_band if in_band else fleet


def rank_request(payload: dict, fleet: list[Vehicle], req: Request) -> list[Vehicle]:
    """Full candidate ordering, mirroring the PHP comparator (request-only)."""
    pool = band_pool(hard_filter(fleet, req), req)
    if not pool:
        return []
    max_rate = fleet_stats(fleet)
    cols = payload.get("features")
    matrix = []
    for v in pool:
        f = compute_features(v, req, max_rate)
        matrix.append([f[k] for k in cols] if cols else list(f.values()))
    scores = scores_from_payload(payload, np.asarray(matrix, dtype=float))

    def sort_key(item):
        v, s = item
        type_match = 0 if req.preferred_type is None else (
            1 if v.vehicle_type == req.preferred_type else 0
        )
        # PHP chain (hybrid inactive): seats asc -> type match desc -> rate asc -> score desc
        return (v.seats, -type_match, v.daily_rate, -float(s))

    return [v for v, _ in sorted(zip(pool, scores), key=sort_key)]


def top_pick(payload: dict, fleet: list[Vehicle], req: Request) -> Vehicle | None:
    ranked = rank_request(payload, fleet, req)
    return ranked[0] if ranked else None


def _score(payload: dict, features: dict) -> float:
    cols = payload.get("features")
    row = [features[k] for k in cols] if cols else list(features.values())
    return float(scores_from_payload(payload, np.asarray([row], dtype=float))[0])


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _fixture(name: str):
    def deco(fn):
        def run(payload) -> tuple[bool, str]:
            try:
                return fn(payload)
            except Exception as exc:  # noqa: BLE001 - a crash is a failed gate
                return False, f"error: {exc}"

        run.__name__ = name
        return run

    return deco


@_fixture("never_oversize")
def _never_oversize(payload):
    fleet = [
        Vehicle(1, "AUV", 5, 4, 2200, 2021),
        Vehicle(2, "SEDAN", 5, 3, 3200, 2022),
        Vehicle(3, "SEDAN", 5, 3, 3500, 2023),
        Vehicle(4, "L300", 12, 12, 4500, 2021),
        Vehicle(5, "L300", 18, 16, 6000, 2024),
    ]
    top = top_pick(payload, fleet, Request(2, 2, None, None, None))
    ok = top is not None and top.seats <= 5
    return ok, f"top={None if top is None else top.vehicle_type + '/' + str(top.seats) + ' seats'} (want <=5)"


@_fixture("seat_sufficient")
def _seat_sufficient(payload):
    fleet = [
        Vehicle(1, "AUV", 5, 4, 2200, 2021),
        Vehicle(2, "SEDAN", 5, 3, 3500, 2023),
        Vehicle(3, "L300", 12, 12, 4500, 2021),
    ]
    top = top_pick(payload, fleet, Request(8, 1, None, None, None))
    ok = top is not None and top.seats >= 8
    return ok, f"top={None if top is None else top.vehicle_type + '/' + str(top.seats) + ' seats'} (want >=8)"


@_fixture("budget_respected")
def _budget_respected(payload):
    fleet = [
        Vehicle(1, "AUV", 5, 4, 2200, 2021),
        Vehicle(2, "SEDAN", 5, 3, 3200, 2022),
    ]
    req = Request(2, 2, 5000, None, None)  # 4400 vs 6400 total -> only AUV feasible
    top = top_pick(payload, fleet, req)
    total = None if top is None else top.daily_rate * req.days
    ok = top is not None and total <= req.budget
    return ok, f"top total={total} (want <= {req.budget})"


@_fixture("luggage_hard_filter")
def _luggage_hard_filter(payload):
    fleet = [
        Vehicle(1, "AUV", 5, 4, 2200, 2021),
        Vehicle(2, "L300", 12, 12, 4500, 2021),
    ]
    top = top_pick(payload, fleet, Request(2, 1, None, "large", None))  # large = 6 pieces
    ok = top is not None and top.luggage_capacity >= LUGGAGE_REQUIRED["large"]
    return ok, f"top={None if top is None else top.vehicle_type + '/' + str(top.luggage_capacity)} (want >=6)"


@_fixture("leanest_fit_first")
def _leanest_fit_first(payload):
    fleet = [
        Vehicle(1, "SEDAN", 5, 3, 3500, 2023),
        Vehicle(2, "AUV", 5, 4, 2600, 2020),
    ]
    top = top_pick(payload, fleet, Request(2, 1, None, None, None))
    ok = top is not None and top.seats == 5
    return ok, f"top seats={None if top is None else top.seats} (want 5, leanest fit)"


@_fixture("stated_type_tiebreak")
def _stated_type_tiebreak(payload):
    # Equal seats on both: the stated type must break the tie even when the
    # alternative is cheaper (chain: seats -> type match -> rate -> score).
    fleet = [
        Vehicle(1, "AUV", 5, 4, 2500, 2021),
        Vehicle(2, "SEDAN", 5, 3, 3200, 2022),
    ]
    top = top_pick(payload, fleet, Request(4, 1, None, None, "SEDAN"))
    ok = top is not None and top.vehicle_type == "SEDAN"
    return ok, f"top={None if top is None else top.vehicle_type} (want SEDAN)"


@_fixture("no_preference_keeps_cheapest_tie")
def _no_preference_keeps_cheapest_tie(payload):
    fleet = [
        Vehicle(1, "AUV", 5, 4, 2500, 2021),
        Vehicle(2, "SEDAN", 5, 3, 3200, 2022),
    ]
    top = top_pick(payload, fleet, Request(4, 1, None, None, None))
    ok = top is not None and top.daily_rate == 2500
    return ok, f"top rate={None if top is None else top.daily_rate} (want 2500)"


def _base_features() -> dict:
    v = Vehicle(1, "AUV", 5, 4, 2200, 2021)
    req = Request(4, 1, 5000, None, None)
    return compute_features(v, req, fleet_stats([v]))


@_fixture("score_seat_sufficient_positive")
def _score_seat_sufficient_positive(payload):
    f0 = dict(_base_features(), seat_sufficient=0.0)
    f1 = dict(_base_features(), seat_sufficient=1.0)
    s0, s1 = _score(payload, f0), _score(payload, f1)
    ok = s1 > s0
    return ok, f"score {s0:.4f} -> {s1:.4f} (want strictly higher)"


@_fixture("score_within_budget_positive")
def _score_within_budget_positive(payload):
    f0 = dict(_base_features(), within_budget=0.0)
    f1 = dict(_base_features(), within_budget=1.0)
    s0, s1 = _score(payload, f0), _score(payload, f1)
    ok = s1 > s0
    return ok, f"score {s0:.4f} -> {s1:.4f} (want strictly higher)"


@_fixture("score_bounded_0_1")
def _score_bounded_0_1(payload):
    ok = 0.0 <= _score(payload, _base_features()) <= 1.0
    return ok, f"score={_score(payload, _base_features()):.6f} (want in [0,1])"


@_fixture("demo_fleet_recommendable")
def _demo_fleet_recommendable(payload):
    top = top_pick(payload, FALLBACK_FLEET, Request(4, 3, 20000, "medium", None))
    ok = top is not None and top.seats >= 4 and top.luggage_capacity >= 4
    return ok, f"top={None if top is None else top.vehicle_type + '/' + str(top.vehicle_id)}"


FIXTURES = [
    _never_oversize,
    _seat_sufficient,
    _budget_respected,
    _luggage_hard_filter,
    _leanest_fit_first,
    _stated_type_tiebreak,
    _no_preference_keeps_cheapest_tie,
    _score_seat_sufficient_positive,
    _score_within_budget_positive,
    _score_bounded_0_1,
    _demo_fleet_recommendable,
]


def run_suite(payload: dict) -> dict:
    results = []
    for fx in FIXTURES:
        ok, detail = fx(payload)
        results.append({"name": fx.__name__, "pass": bool(ok), "detail": detail})
    passed = sum(1 for r in results if r["pass"])
    return {
        "gate": "E2_policy_regression",
        "passed": passed,
        "total": len(results),
        "all_pass": passed == len(results),
        "results": results,
    }


def print_report(report: dict) -> None:
    for r in report["results"]:
        mark = "PASS" if r["pass"] else "FAIL"
        print(f"[policy] {mark}  {r['name']:<32} {r['detail']}")
    print(f"[policy] E2: {report['passed']}/{report['total']} passed"
          + ("" if report["all_pass"] else "  <<< SAFETY GATE E2 FAILED"))


if __name__ == "__main__":
    import json
    from train import DEFAULT_OUT

    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    with open(path, "r", encoding="utf-8") as fh:
        payload = json.load(fh)
    rep = run_suite(payload)
    print_report(rep)
    sys.exit(0 if rep["all_pass"] else 1)
