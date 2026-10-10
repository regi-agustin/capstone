"""
Training-data gate for the FleetOps recommender.

    python training/gate.py             # validate, classify, write statuses, export
    python training/gate.py --status    # read-only summary (no DB writes, no export)
    python training/gate.py --help

THE RULE: a customer's choice is never assumed to be the correct answer.
Raw recommendation exposures/choices (api/ai_assistant.php) land in
recommendation_logs as label_status='raw' and train nothing until this gate
validates, classifies and exports them.

Two independent eligibility lanes (never collapsed):

  Lane A - ranker labels   label_status        strict; contradictions go to
                                               'pending' for admin review;
                                               only eligible rows export.
  Lane B - CF/CB           interaction_status  booking facts only. A
                                               contradicted-but-converted row
                                               stays interaction-eligible: the
                                               booking happened, the *stated
                                               preference* was the noise.

Fail-closed principles:
  * integrity failure -> label rejected (human approval cannot un-corrupt data)
  * cancelled/denied booking -> both lanes dead (fact invalidated), even if a
    human previously approved the label
  * a reservation linked to ANY log row never yields a separate reservation
    example, so a pending/rejected log cannot leak past review
  * DB unreachable / table missing -> hard error, never an empty "pass"

Outputs (consumed exclusively by the trainers):
  api/model/gated_examples.json   Lane A examples + Lane B raw signal
  api/model/gate_report.json      audit counts + reason histogram
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone

TRAINING_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(TRAINING_DIR)
sys.path.insert(0, TRAINING_DIR)

from dataset import LUGGAGE_CAPACITY_BY_TYPE, _read_db_config  # noqa: E402

MODEL_DIR = os.path.join(PROJECT_DIR, "api", "model")
EXAMPLES_OUT = os.path.join(MODEL_DIR, "gated_examples.json")
REPORT_OUT = os.path.join(MODEL_DIR, "gate_report.json")

# Every non-terminal booking state counts as converted intent; cancelled and
# denied kill both lanes (kept in sync with api/ai_assistant.php + bookings.php).
CONVERTED_STATUSES = ("pending", "pricing_approved", "confirmed", "on_trip", "completed")
DEAD_STATUSES = ("cancelled", "denied")

CHOICE_MAX_AGE_H = 48  # choice must land within 48h of its exposure

PREF_TYPE_RE = re.compile(r"preferred_type\s*=\s*(AUV|SEDAN|L300)", re.IGNORECASE)


# ---------------------------------------------------------------------------
# DB access (fail-closed: no demo fallbacks here)
# ---------------------------------------------------------------------------

def _connect():
    import pymysql

    cfg = _read_db_config()
    return pymysql.connect(
        host=cfg.get("DB_HOST", "localhost"),
        database=cfg.get("DB_NAME", "fleetops_db"),
        user=cfg.get("DB_USER", "root"),
        password=cfg.get("DB_PASS", ""),
        connect_timeout=3,
        read_timeout=15,
        autocommit=True,
    )


def _require_gate_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recommendation_logs'"
        )
        if not cur.fetchone()[0]:
            raise SystemExit(
                "[gate] recommendation_logs is missing. Run: python training/migrate.py"
            )


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def load_logs(conn) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT log_id, created_at, signature, client_id, email, passengers, days, "
            "       budget, luggage_size, preferred_type, shown_ids, top_vehicle_id, "
            "       model_version, chosen_vehicle_id, chosen_rank, picked_from, chosen_at, "
            "       reservation_id, label_status, interaction_status, data_class, reasons, "
            "       reviewed_by, reviewed_at, review_note, validated_at "
            "  FROM recommendation_logs ORDER BY log_id"
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def load_fleet(conn) -> dict[int, dict]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT vehicle_id, vehicle_type, seats, COALESCE(luggage_capacity, 0), daily_rate, year "
            "  FROM vehicles"
        )
        return {
            int(r[0]): {
                "vehicle_id": int(r[0]),
                "vehicle_type": str(r[1]),
                "seats": int(r[2]),
                "luggage_capacity": int(r[3]) or LUGGAGE_CAPACITY_BY_TYPE.get(str(r[1]), 4),
                "daily_rate": float(r[4]),
                "year": int(r[5]),
            }
            for r in cur.fetchall()
        }


def load_reservations(conn) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT r.reservation_id, r.client_id, r.vehicle_id, r.start_date, r.end_date, "
            "       r.passengers, r.luggage, r.total_amount, r.special_requests, r.status "
            "  FROM reservations r "
            " WHERE r.vehicle_id IS NOT NULL AND r.passengers IS NOT NULL "
            "   AND r.status IN ('pending', 'pricing_approved', 'confirmed', 'on_trip', 'completed')"
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def load_booking_counts(conn) -> list[tuple[int, int, int]]:
    """Lane B raw signal: (client_id, vehicle_id, booking_count) for live bookings."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT r.client_id, r.vehicle_id, COUNT(*) "
            "  FROM reservations r "
            " WHERE r.vehicle_id IS NOT NULL AND r.client_id IS NOT NULL "
            "   AND r.status IN ('pending', 'pricing_approved', 'confirmed', 'on_trip', 'completed') "
            " GROUP BY r.client_id, r.vehicle_id"
        )
        return [(int(a), int(b), int(c)) for a, b, c in cur.fetchall()]


def load_ratings(conn) -> list[tuple[int, int, float]]:
    """Lane B explicit signal: (client_id, vehicle_id, rating 1-5) on live bookings."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(r.client_id, c.client_id), r.vehicle_id, f.rating "
            "  FROM feedback f "
            "  JOIN reservations r ON r.reservation_id = f.reservation_id "
            "  LEFT JOIN clients c ON c.user_id = f.user_id "
            " WHERE r.vehicle_id IS NOT NULL AND r.client_id IS NOT NULL "
            "   AND r.status IN ('pending', 'pricing_approved', 'confirmed', 'on_trip', 'completed')"
        )
        return [(int(a), int(b), float(c)) for a, b, c in cur.fetchall()
                if a is not None and b is not None and c is not None]


def load_linked_reservation_ids(conn) -> set[int]:
    with conn.cursor() as cur:
        cur.execute("SELECT DISTINCT reservation_id FROM recommendation_logs WHERE reservation_id IS NOT NULL")
        return {int(r[0]) for r in cur.fetchall()}


# ---------------------------------------------------------------------------
# Validation + classification (pure functions; DB write happens later)
# ---------------------------------------------------------------------------

def validate_log(row: dict) -> list[str]:
    """Integrity failures -> label lane dead regardless of any human review."""
    reasons: list[str] = []
    try:
        shown = json.loads(row["shown_ids"] or "[]")
    except (ValueError, TypeError):
        shown = None
    if not isinstance(shown, list) or not all(isinstance(x, int) for x in shown):
        reasons.append("unparseable_shown")
        shown = []

    chosen = row["chosen_vehicle_id"]
    if chosen is not None:
        if int(chosen) not in shown:
            reasons.append("chosen_not_shown")
        if not row["chosen_at"]:
            reasons.append("missing_choice_time")
        elif row["created_at"]:
            age_h = (row["chosen_at"] - row["created_at"]).total_seconds() / 3600.0
            if age_h > CHOICE_MAX_AGE_H or age_h < -1:
                reasons.append("late_choice")
    if int(row["days"] or 0) < 1:
        reasons.append("invalid_days")
    return reasons


def classify_log(row: dict, fleet: dict[int, dict], reservation_status: dict[int, str]) -> dict:
    """-> {label_status, interaction_status, data_class, reasons} (fail-closed)."""
    reasons = validate_log(row)
    if reasons:
        # Booking facts may still stand for Lane B; labels are corrupt.
        linked = row["reservation_id"]
        alive = linked is not None and reservation_status.get(int(linked)) in CONVERTED_STATUSES
        return {
            "label_status": "rejected",
            "interaction_status": "eligible" if alive and row["chosen_vehicle_id"] else "excluded",
            "data_class": "invalid",
            "reasons": reasons,
        }

    linked = row["reservation_id"]
    res_status = reservation_status.get(int(linked)) if linked is not None else None

    # --- fact checks: no live conversion kills everything -----------------
    if row["chosen_vehicle_id"] is None:
        return {
            "label_status": "analysis_only",
            "interaction_status": "excluded",
            "data_class": "unconverted",
            "reasons": ["no_choice"],
        }
    if linked is None or res_status is None:
        return {
            "label_status": "analysis_only",
            "interaction_status": "excluded",
            "data_class": "unconverted",
            "reasons": ["not_linked"],
        }
    if res_status in DEAD_STATUSES:
        return {
            "label_status": "analysis_only",
            "interaction_status": "excluded",
            "data_class": "cancelled",
            "reasons": [f"booking_{res_status}"],
        }

    # --- converted: the booking is a Lane B fact no matter what -----------
    interaction = "eligible"
    reasons: list[str] = ["verified_conversion"]

    chosen = fleet.get(int(row["chosen_vehicle_id"]))
    contradicted = False
    if chosen is None:
        # Vehicle left the fleet: no label features computable, booking stands.
        return {
            "label_status": "analysis_only",
            "interaction_status": interaction,
            "data_class": "cancelled",
            "reasons": ["chosen_vehicle_removed"],
        }

    pref = (row["preferred_type"] or "").upper()
    if pref and chosen["vehicle_type"].upper() != pref:
        reasons.append("type_contradiction")
        contradicted = True
    if row["budget"] is not None:
        total = chosen["daily_rate"] * int(row["days"] or 1)
        if total > float(row["budget"]) + 1e-6:
            reasons.append("budget_contradiction")
            contradicted = True

    # Explicit rating (strongest preference signal) when present.
    rated = bool(row.get("_rating"))

    # --- Lane A decision with human precedence ----------------------------
    human = row["reviewed_by"] is not None
    if human:
        # Human decision stands while the fact stands (dead facts handled above).
        label = row["label_status"] if row["label_status"] in ("eligible", "rejected") else "pending"
        reasons.append("human_approved" if label == "eligible" else "human_rejected")
        data_class = label if label == "eligible" else "rejected"
    elif contradicted:
        label = "pending"  # unreliable label -> admin review, never auto-trains
        data_class = "contradicted"
    else:
        label = "eligible"
        data_class = "verified"

    if label == "eligible" and rated:
        data_class = "rated"
        reasons.append("rating_present")

    return {
        "label_status": label,
        "interaction_status": interaction,
        "data_class": data_class,
        "reasons": reasons,
    }


# ---------------------------------------------------------------------------
# Reservation-derived examples (converted history; skips log-linked rows)
# ---------------------------------------------------------------------------

def parse_luggage_size(text) -> str | None:
    lowered = (text or "").lower()
    return next((s for s in ("large", "medium", "small") if s in lowered), None)


def parse_preferred_type(special_requests) -> str | None:
    m = PREF_TYPE_RE.search(special_requests or "")
    return m.group(1).upper() if m else None


def reservation_example(res: dict) -> dict | None:
    days = max(1, (res["end_date"] - res["start_date"]).days) if hasattr(res["end_date"] - res["start_date"], "days") else 1
    budget = None
    total = float(res["total_amount"] or 0)
    if total > 0:
        budget = round(round(total / days, 2) * days, 2)
    return {
        "passengers": max(0, int(res["passengers"] or 0)),
        "days": days,
        "budget": budget,
        "luggage_size": parse_luggage_size(res["luggage"]),
        "preferred_type": parse_preferred_type(res["special_requests"]),
        "chosen_vehicle_id": int(res["vehicle_id"]),
        "source": "reservation",
        "reservation_id": int(res["reservation_id"]),
        "weight": 1.0,
    }


# ---------------------------------------------------------------------------
# Export + writeback
# ---------------------------------------------------------------------------

def write_json(path: str, payload: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    import time

    last: OSError | None = None
    for attempt in range(4):
        try:
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, indent=2)
            os.replace(tmp, path)
            return
        except OSError as exc:  # Windows transient locks (AV/indexer)
            last = exc
            time.sleep(0.3)
    raise last


def run_gate(write: bool = True) -> dict:
    conn = _connect()
    try:
        _require_gate_table(conn)
        logs = load_logs(conn)
        fleet = load_fleet(conn)
        reservations = load_reservations(conn)
        linked_ids = load_linked_reservation_ids(conn)
        booking_counts = load_booking_counts(conn)
        ratings = load_ratings(conn)
        with conn.cursor() as cur:
            cur.execute("SELECT reservation_id, rating FROM feedback WHERE reservation_id IS NOT NULL")
            rating_by_res = {int(rid): float(rating) for rid, rating in cur.fetchall()}
            cur.execute("SELECT reservation_id, status FROM reservations")
            res_status = {int(rid): str(status) for rid, status in cur.fetchall()}
    finally:
        conn.close()

    # --- classify every log row ------------------------------------------
    classified: list[tuple[dict, dict]] = []
    for row in logs:
        if row["reservation_id"] is not None:
            row["_rating"] = rating_by_res.get(int(row["reservation_id"]))
        else:
            row["_rating"] = None
        classified.append((row, classify_log(row, fleet, res_status)))

    # --- write back changed statuses (machine respects human + dead facts) -
    updates: list[tuple] = []
    for row, verdict in classified:
        try:
            stored_reasons = json.loads(row["reasons"] or "[]")
        except (ValueError, TypeError):
            stored_reasons = None
        if (row["label_status"] != verdict["label_status"]
                or row["interaction_status"] != verdict["interaction_status"]
                or row["data_class"] != verdict["data_class"]
                or stored_reasons != verdict["reasons"]
                or row["validated_at"] is None):
            updates.append((
                verdict["label_status"], verdict["interaction_status"],
                verdict["data_class"], json.dumps(verdict["reasons"]),
                datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                int(row["log_id"]),
            ))

    if write and updates:
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.executemany(
                    "UPDATE recommendation_logs "
                    "SET label_status = %s, interaction_status = %s, data_class = %s, "
                    "    reasons = %s, validated_at = %s "
                    "WHERE log_id = %s",
                    updates,
                )
        finally:
            conn.close()

    # --- Lane A examples --------------------------------------------------
    log_examples: list[dict] = []
    for row, verdict in classified:
        if verdict["label_status"] != "eligible":
            continue
        approved_by_human = row["reviewed_by"] is not None and verdict["label_status"] == "eligible"
        log_examples.append({
            "passengers": max(0, int(row["passengers"] or 0)),
            "days": max(1, int(row["days"] or 1)),
            "budget": float(row["budget"]) if row["budget"] is not None else None,
            "luggage_size": row["luggage_size"],
            "preferred_type": (row["preferred_type"] or "").upper() or None,
            "chosen_vehicle_id": int(row["chosen_vehicle_id"]),
            "source": "log",
            "log_id": int(row["log_id"]),
            "data_class": verdict["data_class"],
            # Human-approved rows carry half weight: the machine could not
            # verify them on its own.
            "weight": 0.5 if approved_by_human else 1.0,
        })

    res_examples: list[dict] = []
    for res in reservations:
        if int(res["reservation_id"]) in linked_ids:
            continue  # fail-closed: log-linked bookings only speak through their log
        ex = reservation_example(res)
        if ex:
            res_examples.append(ex)

    examples = log_examples + res_examples

    # --- Lane B interactions (facts; independent of label review) ---------
    bookings_payload = [[c, v, n] for c, v, n in booking_counts]
    ratings_payload = [[c, v, r] for c, v, r in ratings]

    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    counts = {
        "logs_total": len(logs),
        "converted_reservations": len(reservations),
        "log_linked_reservations": len(linked_ids),
        "examples": len(examples),
        "log_examples": len(log_examples),
        "reservation_examples": len(res_examples),
        "booking_pairs": len(bookings_payload),
        "ratings": len(ratings_payload),
    }
    by_label: dict[str, int] = {}
    by_class: dict[str, int] = {}
    by_interaction: dict[str, int] = {}
    reason_hist: dict[str, int] = {}
    for row, verdict in classified:
        by_label[verdict["label_status"]] = by_label.get(verdict["label_status"], 0) + 1
        by_class[verdict["data_class"]] = by_class.get(verdict["data_class"], 0) + 1
        by_interaction[verdict["interaction_status"]] = by_interaction.get(verdict["interaction_status"], 0) + 1
        for r in verdict["reasons"]:
            reason_hist[r] = reason_hist.get(r, 0) + 1
    counts["by_label_status"] = by_label
    counts["by_data_class"] = by_class
    counts["by_interaction_status"] = by_interaction

    report = {
        "generated_at": generated_at,
        "rule": "customer choices never train until validated; two-lane eligibility",
        "counts": counts,
        "reason_histogram": reason_hist,
        "rows": [
            {
                "log_id": int(row["log_id"]),
                "label_status": v["label_status"],
                "interaction_status": v["interaction_status"],
                "data_class": v["data_class"],
                "reasons": v["reasons"],
            }
            for row, v in classified
        ],
    }
    examples_payload = {
        "generated_at": generated_at,
        "counts": counts,
        "examples": examples,
        "bookings": bookings_payload,
        "ratings": ratings_payload,
    }

    if write:
        write_json(EXAMPLES_OUT, examples_payload)
        write_json(REPORT_OUT, report)

    return {"report": report, "examples": examples_payload, "written": bool(write)}


def print_status(result: dict) -> None:
    c = result["report"]["counts"]
    print(f"[gate] generated_at={result['report']['generated_at']}")
    print(f"[gate] logs={c['logs_total']}  converted_reservations={c['converted_reservations']}")
    print(f"[gate] label_status: {c.get('by_label_status', {})}")
    print(f"[gate] data_class:   {c.get('by_data_class', {})}")
    print(f"[gate] interaction:  {c.get('by_interaction_status', {})}")
    print(f"[gate] Lane A examples={c['examples']} (log={c['log_examples']}, "
          f"reservation={c['reservation_examples']})")
    print(f"[gate] Lane B booking_pairs={c['booking_pairs']} ratings={c['ratings']}")
    if result["report"]["reason_histogram"]:
        print(f"[gate] reasons: {result['report']['reason_histogram']}")
    print("[gate] " + ("exports written." if result["written"] else "dry run - nothing written."))


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate, classify and gate training data.")
    parser.add_argument("--status", action="store_true", help="read-only summary; no writes")
    args = parser.parse_args()

    try:
        result = run_gate(write=not args.status)
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001 - fail closed on any DB/IO problem
        raise SystemExit(f"[gate] FAILED (fail-closed, no exports touched): {exc}") from exc
    print_status(result)


if __name__ == "__main__":
    main()
