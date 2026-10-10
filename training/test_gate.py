"""
Branch tests for the training gate's classification rules (pure functions,
no DB, no writes). Run: python training/test_gate.py

Covers the governing rule end to end at the decision level:
  * integrity failure -> label rejected (never trainable, human or not)
  * no conversion ever reaches 'eligible' (label OR interaction lane)
  * dead booking kills both lanes even after human approval
  * contradiction -> pending (admin review), never auto-trains
  * human review wins on Lane A while the fact stands
  * booking fact survives label rejection for Lane B
  * rated eligible rows classify as 'rated'
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gate import classify_log, parse_luggage_size, parse_preferred_type, validate_log  # noqa: E402

NOW = datetime(2026, 10, 1, 12, 0, 0)

FLEET = {
    10: {"vehicle_id": 10, "vehicle_type": "AUV", "seats": 5,
         "luggage_capacity": 4, "daily_rate": 2500.0, "year": 2022},
    11: {"vehicle_id": 11, "vehicle_type": "SEDAN", "seats": 5,
         "luggage_capacity": 3, "daily_rate": 4000.0, "year": 2023},
}
RES_STATUS = {100: "completed", 101: "cancelled", 102: "confirmed", 103: "denied"}

_failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if cond:
        print(f"PASS  {name}")
    else:
        _failures.append(name)
        print(f"FAIL  {name}  {detail}")


def row(**overrides) -> dict:
    base = {
        "log_id": 1,
        "created_at": NOW,
        "signature": "sig",
        "client_id": 1,
        "email": "test@example.com",
        "passengers": 4,
        "days": 3,
        "budget": 9000.0,
        "luggage_size": None,
        "preferred_type": None,
        "shown_ids": json.dumps([10, 11]),
        "top_vehicle_id": 10,
        "model_version": 1,
        "chosen_vehicle_id": 10,
        "chosen_rank": 1,
        "picked_from": "assistant",
        "chosen_at": NOW + timedelta(minutes=5),
        "reservation_id": 100,
        "label_status": "raw",
        "interaction_status": "unknown",
        "data_class": None,
        "reasons": "[]",
        "reviewed_by": None,
        "reviewed_at": None,
        "review_note": None,
        "validated_at": None,
        "_rating": None,
    }
    base.update(overrides)
    return base


# --- integrity (label lane dies, fact may stand) ---------------------------
v = classify_log(row(), FLEET, RES_STATUS)
check("clean converted row -> eligible/eligible/verified",
      (v["label_status"], v["interaction_status"], v["data_class"])
      == ("eligible", "eligible", "verified"), str(v))

v = classify_log(row(chosen_vehicle_id=99), FLEET, RES_STATUS)
check("chosen_not_shown -> rejected but interaction eligible (live booking)",
      v["label_status"] == "rejected" and v["interaction_status"] == "eligible"
      and "chosen_not_shown" in v["reasons"], str(v))

v = classify_log(row(chosen_at=None), FLEET, RES_STATUS)
check("missing_choice_time -> rejected", "missing_choice_time" in v["reasons"]
      and v["label_status"] == "rejected", str(v))

v = classify_log(row(chosen_at=NOW + timedelta(hours=72)), FLEET, RES_STATUS)
check("late_choice (>48h) -> rejected", "late_choice" in v["reasons"]
      and v["label_status"] == "rejected", str(v))

v = classify_log(row(shown_ids="{not json"), FLEET, RES_STATUS)
check("unparseable_shown -> rejected", "unparseable_shown" in v["reasons"]
      and v["label_status"] == "rejected", str(v))

v = classify_log(row(days=0), FLEET, RES_STATUS)
check("invalid_days -> rejected", "invalid_days" in v["reasons"]
      and v["label_status"] == "rejected", str(v))

v = classify_log(row(chosen_vehicle_id=99, reservation_id=None), FLEET, RES_STATUS)
check("integrity failure with no booking -> both lanes dead",
      v["label_status"] == "rejected" and v["interaction_status"] == "excluded", str(v))

# --- no conversion --------------------------------------------------------
v = classify_log(row(chosen_vehicle_id=None), FLEET, RES_STATUS)
check("no choice -> analysis_only/unconverted",
      (v["label_status"], v["interaction_status"], v["data_class"])
      == ("analysis_only", "excluded", "unconverted"), str(v))

v = classify_log(row(reservation_id=None), FLEET, RES_STATUS)
check("not linked -> analysis_only/unconverted",
      v["label_status"] == "analysis_only" and "not_linked" in v["reasons"], str(v))

v = classify_log(row(reservation_id=999), FLEET, RES_STATUS)
check("linked to missing reservation -> analysis_only",
      v["label_status"] == "analysis_only" and v["interaction_status"] == "excluded", str(v))

# --- dead bookings --------------------------------------------------------
v = classify_log(row(reservation_id=101), FLEET, RES_STATUS)
check("cancelled booking -> analysis_only + interaction excluded",
      v["label_status"] == "analysis_only" and v["interaction_status"] == "excluded"
      and "booking_cancelled" in v["reasons"], str(v))

v = classify_log(row(reservation_id=103, reviewed_by=7, label_status="eligible"),
                 FLEET, RES_STATUS)
check("human approval cannot revive a denied booking (both lanes dead)",
      v["label_status"] == "analysis_only" and v["interaction_status"] == "excluded", str(v))

# --- contradictions -> pending (never auto-train) -------------------------
v = classify_log(row(preferred_type="SEDAN"), FLEET, RES_STATUS)
check("type contradiction -> pending/contradicted",
      v["label_status"] == "pending" and v["data_class"] == "contradicted"
      and "type_contradiction" in v["reasons"], str(v))

v = classify_log(row(budget=1000.0), FLEET, RES_STATUS)  # 2500*3 > 1000
check("budget contradiction -> pending/contradicted",
      v["label_status"] == "pending" and "budget_contradiction" in v["reasons"], str(v))

v = classify_log(row(preferred_type="SEDAN"), FLEET, RES_STATUS)
check("contradicted row still interaction-eligible (booking is a fact)",
      v["interaction_status"] == "eligible", str(v))

# --- human precedence (Lane A) -------------------------------------------
v = classify_log(row(reviewed_by=7, label_status="eligible"), FLEET, RES_STATUS)
check("human approved -> eligible + human_approved reason",
      v["label_status"] == "eligible" and "human_approved" in v["reasons"], str(v))

v = classify_log(row(reviewed_by=7, label_status="rejected"), FLEET, RES_STATUS)
check("human rejected -> rejected even though the row is clean",
      v["label_status"] == "rejected" and "human_rejected" in v["reasons"], str(v))

v = classify_log(row(reviewed_by=7, label_status="eligible", preferred_type="SEDAN"),
                 FLEET, RES_STATUS)
check("human decision stands on a contradicted row while the fact stands",
      v["label_status"] == "eligible" and "type_contradiction" in v["reasons"], str(v))

v = classify_log(row(reviewed_by=7, label_status="raw"), FLEET, RES_STATUS)
check("reviewed but status not eligible/rejected -> pending (fail-closed)",
      v["label_status"] == "pending", str(v))

# --- fleet changes --------------------------------------------------------
v = classify_log(row(chosen_vehicle_id=99, shown_ids=json.dumps([99, 10])),
                 FLEET, RES_STATUS)
check("chosen vehicle removed from fleet -> analysis_only, interaction stands",
      v["label_status"] == "analysis_only" and v["interaction_status"] == "eligible"
      and "chosen_vehicle_removed" in v["reasons"], str(v))

# --- ratings --------------------------------------------------------------
v = classify_log(row(_rating=5), FLEET, RES_STATUS)
check("eligible + explicit rating -> data_class 'rated'",
      v["label_status"] == "eligible" and v["data_class"] == "rated"
      and "rating_present" in v["reasons"], str(v))

v = classify_log(row(_rating=5, reviewed_by=7, label_status="eligible"),
                 FLEET, RES_STATUS)
check("human-approved + rated -> rated (weight bug regression)",
      v["label_status"] == "eligible" and v["data_class"] == "rated", str(v))

# --- validate_log / parsers ----------------------------------------------
reasons = validate_log(row(days=0))
check("validate_log flags invalid days", reasons == ["invalid_days"], str(reasons))
check("parse_luggage_size", parse_luggage_size("2 large bags") == "large")
check("parse_preferred_type",
      parse_preferred_type("window seat, preferred_type=l300") == "L300")
check("parse_preferred_type none", parse_preferred_type("no prefs") is None)

# --- summary --------------------------------------------------------------
print()
if _failures:
    print(f"{len(_failures)} FAILED: {', '.join(_failures)}")
    raise SystemExit(1)
print("All gate branch tests passed.")
