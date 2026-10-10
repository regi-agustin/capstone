"""
FleetOps retrain orchestrator: GATE -> TRAIN -> EVALUATE -> DEPLOY ONLY IF SAFE.

    python training/retrain.py                # full pipeline with safety gates
    python training/retrain.py --tune         # + grid-search the ranker
    python training/retrain.py --if-needed    # skip unless new data / flag file
    python training/retrain.py --promote-pending   # explicit override after a failed gate
    python training/retrain.py --dry-run      # run everything, never deploy

Stages (plan order):
  1 GATE      training/gate.py validates/classifies raw behavior into
              api/model/gated_examples.json + gate_report.json (fail-closed)
  2 TRAIN     ranker on gated data (optional tuning); CF/CB from Lane B facts
  3 EVALUATE  E1 non-inferiority vs current production on the SAME holdout
              E2 policy regression suite (house policy, not customer data)
              E3a CF only deploys usable (rmse beats baseline -> status ok)
              E3b CB only deploys usable (holdout HR@3 beats random)
  4 DEPLOY    only if every hard gate passes: write model JSONs, sync the
              XAMPP htdocs copy when present, clear retrain.requested
              otherwise: production untouched, candidates -> api/model/pending/

The governing rule lives in gate.py: a customer's choice never trains until
validated; this orchestrator additionally guarantees that even validated data
cannot ship a model that fails evaluation.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone

import numpy as np

TRAINING_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(TRAINING_DIR)
sys.path.insert(0, TRAINING_DIR)

from dataset import FEATURES, full_dataset  # noqa: E402
from gate import EXAMPLES_OUT, run_gate  # noqa: E402
from train import (  # noqa: E402
    DEFAULT_OUT,
    evaluate_payload,
    fit_payload,
    make_split,
    scores_from_payload,
    to_matrix,
    top1_accuracy,
    tune_candidate,
)
import eval_policy  # noqa: E402

MODEL_DIR = os.path.join(PROJECT_DIR, "api", "model")
REC_OUT = os.path.join(MODEL_DIR, "recommender.json")
PENDING_DIR = os.path.join(MODEL_DIR, "pending")
FLAG_FILE = os.path.join(MODEL_DIR, "retrain.requested")
DEPLOY_REPORT = os.path.join(MODEL_DIR, "deploy_report.json")
HTRDOCS_API = r"C:\xampp\htdocs\fleetops\api"  # setup.bat copy; auto-synced when present

EPS = 0.01  # E1: candidate may be at most 1 point below production (non-inferior)


def log(msg: str) -> None:
    print(f"[retrain] {msg}", flush=True)


def read_json(path: str) -> dict | None:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def write_json(path: str, payload: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
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


def adaptive_synthetic(n_gated: int, override: int | None) -> int:
    """Real data progressively dominates; synthetic only backfills coverage."""
    if override is not None:
        return override
    if n_gated < 100:
        return 3000
    if n_gated < 500:
        return 2000
    return 1000


def e1_vs_production(candidate_eval: dict, test_mask, X, y, g) -> dict:
    """Non-inferiority duel: candidate vs CURRENT production on the SAME split."""
    production = read_json(DEFAULT_OUT)
    if not production or production.get("features") != FEATURES or production.get("source") == "default":
        return {"pass": True, "skipped": True,
                "reason": "no comparable production model", "candidate_test": candidate_eval["top1_accuracy"]}
    try:
        prod_scores = scores_from_payload(production, X[test_mask])
        prod_test = top1_accuracy(prod_scores, y[test_mask], g[test_mask])
    except Exception as exc:  # noqa: BLE001 - unreadable production model cannot duel
        return {"pass": True, "skipped": True, "reason": f"production model unreadable: {exc}",
                "candidate_test": candidate_eval["top1_accuracy"]}
    cand_test = candidate_eval["top1_accuracy"]
    return {
        "pass": bool(cand_test >= prod_test - EPS),
        "skipped": False,
        "candidate_test": cand_test,
        "production_test": round(float(prod_test), 4),
        "eps": EPS,
    }


def run_cf(staging_path: str, gated_path: str) -> dict:
    cmd = [sys.executable, os.path.join(TRAINING_DIR, "recommender.py"),
           "--gated", gated_path, "--out", staging_path]
    proc = subprocess.run(cmd, cwd=PROJECT_DIR)
    if proc.returncode != 0:
        raise SystemExit(f"[retrain] recommender.py failed (exit {proc.returncode})")
    payload = read_json(staging_path)
    if not payload:
        raise SystemExit("[retrain] recommender produced no readable output")
    return payload


def sync_deploy(*files: str) -> list[str]:
    """Copy model artifacts into the Apache htdocs copy (setup.bat layout)."""
    if not os.path.isdir(HTRDOCS_API):
        return []
    dest = os.path.join(HTRDOCS_API, "model")
    os.makedirs(dest, exist_ok=True)
    for f in files:
        if os.path.isfile(f):
            shutil.copy2(f, os.path.join(dest, os.path.basename(f)))
    return [os.path.join(dest, os.path.basename(f)) for f in files if os.path.isfile(f)]


def maybe_clear_flag() -> None:
    try:
        if os.path.isfile(FLAG_FILE):
            os.remove(FLAG_FILE)
    except OSError:
        pass


def promote_pending() -> None:
    ranker = os.path.join(PENDING_DIR, "vehicle_ranker.json")
    rec = os.path.join(PENDING_DIR, "recommender.json")
    report = read_json(os.path.join(PENDING_DIR, "deploy_report.json"))
    if not os.path.isfile(ranker):
        raise SystemExit("[retrain] nothing pending to promote.")
    log("OVERRIDE: promoting pending candidates over production (--promote-pending).")
    if report:
        log(f"  original gate result: E1={report.get('e1')} E2_pass={report.get('e2', {}).get('all_pass')}")
    shutil.copy2(ranker, DEFAULT_OUT)
    if os.path.isfile(rec):
        shutil.copy2(rec, REC_OUT)
    synced = sync_deploy(DEFAULT_OUT, REC_OUT)
    maybe_clear_flag()
    log(f"promoted -> {DEFAULT_OUT}" + (f" and {len(synced)} htdocs file(s)" if synced else ""))


def main() -> None:
    parser = argparse.ArgumentParser(description="Gate + train + evaluate + deploy only if safe.")
    parser.add_argument("--tune", action="store_true", help="grid-search C x class_weight")
    parser.add_argument("--if-needed", action="store_true", help="skip when no new data and no flag file")
    parser.add_argument("--promote-pending", action="store_true", help="force-promote api/model/pending/")
    parser.add_argument("--dry-run", action="store_true", help="evaluate but never deploy")
    parser.add_argument("--synthetic", type=int, default=None, help="override synthetic request count")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--test-size", type=float, default=0.2)
    args = parser.parse_args()

    if args.promote_pending:
        promote_pending()
        return

    # ---- stage 1: GATE ----------------------------------------------------
    log("stage 1/4: GATE (validate + classify raw behavior, two lanes)")
    try:
        gate_result = run_gate(write=True)
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001 - fail closed
        raise SystemExit(f"[retrain] GATE FAILED (nothing trained): {exc}") from exc
    gate_counts = gate_result["report"]["counts"]
    log(f"gate: {json.dumps(gate_counts, sort_keys=True)}")

    # ---- --if-needed check ------------------------------------------------
    if args.if_needed:
        production = read_json(DEFAULT_OUT)
        flag = os.path.isfile(FLAG_FILE)
        known = (production or {}).get("training", {}).get("gate_counts")
        if production and not flag and known == gate_counts:
            log("if-needed: no new data, no flag file -> skip.")
            return
        reasons = []
        if not production:
            reasons.append("no production model")
        if flag:
            reasons.append("flag file present")
        if production and known != gate_counts:
            reasons.append("gate counts changed")
        log("if-needed: training because " + ", ".join(reasons) + ".")

    # ---- stage 2: TRAIN ---------------------------------------------------
    log("stage 2/4: TRAIN (ranker on gated Lane A examples)")
    n_gated = int(gate_counts.get("examples", 0))
    synthetic = adaptive_synthetic(n_gated, args.synthetic)
    rows, labels, groups, weights, ds_counts = full_dataset(
        synthetic_count=synthetic, seed=args.seed, use_gated=True
    )
    X = to_matrix(rows)
    y = np.asarray(labels, dtype=int)
    g = np.asarray(groups, dtype=int)
    w = np.asarray(weights, dtype=float)

    tuning = None
    train_mask, test_mask = make_split(g, args.test_size, args.seed)
    if args.tune:
        log("tuning grid: C x class_weight...")
        candidate, ev, tuning = tune_candidate(X, y, g, w, args.seed, args.test_size)
        log(f"tuned: C={candidate['params']['C']} class_weight={candidate['params']['class_weight']} "
            f"test={ev['top1_accuracy']}")
    else:
        candidate = fit_payload(X, y, g, w, train_mask,
                                {"C": 1.0, "class_weight": "balanced"}, args.seed)
        ev = evaluate_payload(candidate, X, y, g, train_mask, test_mask)
    log(f"candidate: top-1 train={ev['top1_accuracy_train']} test={ev['top1_accuracy']}")

    staging_rec = os.path.join(PENDING_DIR, "recommender.json")
    cf_payload = run_cf(staging_rec, EXAMPLES_OUT)
    cf_status = str(cf_payload.get("status", "missing"))
    log(f"CF stage: status={cf_status} counts={cf_payload.get('counts')}")

    # ---- stage 3: EVALUATE ------------------------------------------------
    log("stage 3/4: EVALUATE (E1 non-inferiority, E2 policy suite, E3a CF / E3b CB safety)")
    e1 = e1_vs_production(ev, test_mask, X, y, g)
    e2 = eval_policy.run_suite(candidate)
    log(f"E1: {json.dumps(e1)}")
    eval_policy.print_report(e2)
    e3a = {"pass": cf_status != "invalid",
           "status": cf_status,
           "note": "invalid means rmse >= baseline; CF stays OFF (fail-safe, not a deploy blocker)"}
    log(f"E3a: {json.dumps(e3a)}")
    rec_staged = read_json(staging_rec) if os.path.isfile(staging_rec) else {}
    cb_hold = (rec_staged.get("cb") or {}).get("holdout") or {}
    e3b = {"pass": cb_hold.get("status") != "invalid",
           "status": cb_hold.get("status", "missing"),
           "hr_at_3": cb_hold.get("hr_at_3"),
           "random_hr_at_3": cb_hold.get("random_hr_at_3"),
           "mrr": cb_hold.get("mrr"),
           "note": "invalid disables CB weights only (fail-safe, not a deploy blocker)"}
    log(f"E3b: {json.dumps(e3b)}")

    all_pass = bool(e1["pass"]) and bool(e2["all_pass"])
    trained_at = datetime.now(timezone.utc).isoformat(timespec="seconds")

    export = {
        "name": "vehicle_ranker",
        "version": 2,
        "model": "logistic_regression",
        "trained_at": trained_at,
        "features": FEATURES,
        "mean": candidate["mean"],
        "scale": candidate["scale"],
        "coefficients": candidate["coefficients"],
        "intercept": candidate["intercept"],
        "params": candidate.get("params", {}),
        "metrics": {
            **ev,
            "rows": int(len(X)),
            "requests": int(len(np.unique(g))),
            "positives": int(y.sum()),
            "weight_sum": round(float(w.sum()), 2),
        },
        "training": {**ds_counts, "gate_counts": gate_counts},
        "eval": {"gate": gate_result["report"]["generated_at"], "e1": e1, "e2": e2,
                 "e3a": e3a, "e3b": e3b, "tuning": tuning, "safety_gates_pass": all_pass},
        "feature_importance": {f: round(float(c), 4) for f, c in zip(FEATURES, candidate["coefficients"])},
    }

    # ---- stage 4: DEPLOY --------------------------------------------------
    if all_pass and not args.dry_run:
        log("stage 4/4: DEPLOY (all hard gates passed)")
        write_json(DEFAULT_OUT, export)
        if os.path.isfile(staging_rec):
            shutil.move(staging_rec, REC_OUT)
        synced = sync_deploy(DEFAULT_OUT, REC_OUT)
        maybe_clear_flag()
        write_json(DEPLOY_REPORT, {
            "generated_at": trained_at, "result": "deployed",
            "e1": e1, "e2_passed": e2["all_pass"], "e3a": e3a,
            "cf_status": cf_status, "synced": synced,
        })
        log(f"deployed ranker -> {DEFAULT_OUT}")
        log(f"deployed recommender ({cf_status}) -> {REC_OUT}")
        if synced:
            log(f"synced {len(synced)} file(s) to {HTRDOCS_API}\\model")
        log(f"accuracy test={ev['top1_accuracy']} vs production={e1.get('production_test', 'n/a')}")
    else:
        reason = "dry-run" if args.dry_run else "safety gate failed"
        log(f"stage 4/4: NOT DEPLOYED ({reason}) - production untouched")
        write_json(os.path.join(PENDING_DIR, "vehicle_ranker.json"), export)
        if os.path.isfile(staging_rec):
            shutil.copy2(staging_rec, os.path.join(PENDING_DIR, "recommender.json"))
        write_json(os.path.join(PENDING_DIR, "deploy_report.json"), {
            "generated_at": trained_at, "result": "held",
            "reason": reason, "e1": e1, "e2": e2, "e3a": e3a, "cf_status": cf_status,
            "how_to_override": "python training/retrain.py --promote-pending",
        })
        write_json(DEPLOY_REPORT, {
            "generated_at": trained_at, "result": "held", "reason": reason,
            "e1": e1, "e2_passed": e2["all_pass"], "e3a": e3a,
        })
        if not args.dry_run:
            raise SystemExit("[retrain] candidates held in api/model/pending/ (see deploy_report.json)")


if __name__ == "__main__":
    main()
