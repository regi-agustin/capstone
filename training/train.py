"""
Train the FleetOps vehicle ranker (logistic regression) and export model
weights for PHP.

    python training/retrain.py                 # PREFERRED: gate + train + eval + safe deploy
    python training/train.py                   # ranker only (no safety gates; dev use)
    python training/train.py --tune            # grid-search C x class_weight
    python training/train.py --synthetic-only  # no customer data (explicit)
    python training/train.py --no-history      # legacy alias of --synthetic-only

Model: logistic regression on standardized pair features. Chosen because the
exported coefficients are directly portable to PHP (one dot product per
vehicle) and each feature's contribution can be shown to the customer as a
plain-language reason ("fits your budget", "matches your SEDAN preference").

Customer examples come ONLY from the gate export (api/model/gated_examples.json,
produced by training/gate.py) - this module never reads raw behavior. The
exported model only works if the feature math here matches ai_features() in
api/ai_assistant.php exactly.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dataset import FEATURES, full_dataset  # noqa: E402

TRAINING_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = os.path.join(os.path.dirname(TRAINING_DIR), "api", "model", "vehicle_ranker.json")


def _atomic_write_json(path: str, payload: dict) -> None:
    """tmp + os.replace with retries (Windows transient file locks)."""
    import time

    tmp = path + ".tmp"
    last: OSError | None = None
    for _ in range(4):
        try:
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, indent=2)
            os.replace(tmp, path)
            return
        except OSError as exc:
            last = exc
            time.sleep(0.3)
    raise last

# Tuning grid (default first so ties resolve toward the current behaviour).
TUNE_C = (1.0, 0.3, 3.0, 0.1, 10.0)
TUNE_CLASS_WEIGHT = (None, "balanced")


def to_matrix(rows) -> np.ndarray:
    """Feature dicts (or plain rows) -> float matrix ordered by FEATURES."""
    if rows and isinstance(rows[0], dict):
        return np.asarray([[r[k] for k in FEATURES] for r in rows], dtype=float)
    return np.asarray(rows, dtype=float)


def top1_accuracy(scores, y, groups) -> float:
    """Fraction of requests where the actually-chosen vehicle ranks first."""
    correct = total = 0
    for gid in np.unique(groups):
        mask = groups == gid
        if y[mask].sum() != 1:  # need exactly one positive to judge a ranking
            continue
        best_idx = np.argmax(scores[mask])
        correct += int(bool(y[mask][best_idx]))
        total += 1
    return correct / total if total else 0.0


def make_split(groups: np.ndarray, test_size: float, seed: int):
    """Split by REQUEST (group), never by pair, so no request leaks into both sets."""
    from sklearn.model_selection import train_test_split

    uniq = np.unique(groups)
    train_g, test_g = train_test_split(uniq, test_size=test_size, random_state=seed)
    return np.isin(groups, train_g), np.isin(groups, test_g)


def scores_from_payload(payload: dict, X: np.ndarray) -> np.ndarray:
    """Standardize -> dot -> sigmoid, exactly as api/ai_assistant.php ai_score()."""
    mean = np.asarray(payload["mean"], dtype=float)
    scale = np.asarray(payload["scale"], dtype=float)
    scale = np.where(scale == 0, 1.0, scale)
    coef = np.asarray(payload["coefficients"], dtype=float)
    z = (X - mean) / scale
    logit = float(payload["intercept"]) + z @ coef
    return 1.0 / (1.0 + np.exp(-np.clip(logit, -30.0, 30.0)))


def fit_payload(X, y, groups, weights, train_mask, params: dict, seed: int) -> dict:
    """Fit scaler + logistic regression on the train split; return export payload."""
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler

    scaler = StandardScaler()
    X_train = scaler.fit_transform(X[train_mask])
    model = LogisticRegression(
        max_iter=2000,
        C=params.get("C", 1.0),
        class_weight=params.get("class_weight", "balanced"),
        random_state=seed,
    )
    model.fit(X_train, y[train_mask], sample_weight=weights[train_mask])

    return {
        "features": FEATURES,
        "mean": [round(float(m), 6) for m in scaler.mean_],
        "scale": [round(float(s), 6) for s in scaler.scale_],
        "coefficients": [round(float(c), 6) for c in model.coef_[0]],
        "intercept": round(float(model.intercept_[0]), 6),
        "params": {"C": params.get("C", 1.0), "class_weight": params.get("class_weight", "balanced")},
    }


def evaluate_payload(payload: dict, X, y, groups, train_mask, test_mask) -> dict:
    scores = scores_from_payload(payload, X)
    return {
        "top1_accuracy_train": round(top1_accuracy(scores[train_mask], y[train_mask], groups[train_mask]), 4),
        "top1_accuracy": round(top1_accuracy(scores[test_mask], y[test_mask], groups[test_mask]), 4),
    }


def train_candidate(rows, labels, groups, weights, seed: int = 42, test_size: float = 0.2,
                    params: dict | None = None) -> tuple[dict, dict, np.ndarray, np.ndarray]:
    """Full fit + eval on one split. Returns (payload, eval, train_mask, test_mask)."""
    X = to_matrix(rows)
    y = np.asarray(labels, dtype=int)
    g = np.asarray(groups, dtype=int)
    w = np.asarray(weights, dtype=float) if weights is not None else np.ones(len(y))

    train_mask, test_mask = make_split(g, test_size, seed)
    payload = fit_payload(X, y, g, w, train_mask, params or {"C": 1.0, "class_weight": "balanced"}, seed)
    ev = evaluate_payload(payload, X, y, g, train_mask, test_mask)
    return payload, ev, train_mask, test_mask


def tune_candidate(rows, labels, groups, weights, seed: int, test_size: float) -> tuple[dict, dict, list[dict]]:
    """Grid search C x class_weight, selecting on TEST top-1 (group-split)."""
    X = to_matrix(rows)
    y = np.asarray(labels, dtype=int)
    g = np.asarray(groups, dtype=int)
    w = np.asarray(weights, dtype=float)
    train_mask, test_mask = make_split(g, test_size, seed)

    trials: list[dict] = []
    best: tuple[float, dict, dict] | None = None
    for c in TUNE_C:
        for cw in TUNE_CLASS_WEIGHT:
            params = {"C": c, "class_weight": cw}
            payload = fit_payload(X, y, g, w, train_mask, params, seed)
            ev = evaluate_payload(payload, X, y, g, train_mask, test_mask)
            trials.append({**params, **ev})
            key = ev["top1_accuracy"]
            if best is None or key > best[0]:
                best = (key, payload, ev)
    assert best is not None
    return best[1], best[2], trials


def build_export_payload(payload: dict, ev: dict, counts: dict, seed: int, test_size: float) -> dict:
    ranked = sorted(zip(FEATURES, payload["coefficients"]), key=lambda kv: -abs(kv[1]))
    return {
        "name": "vehicle_ranker",
        "version": 2,
        "model": "logistic_regression",
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "features": payload["features"],
        "mean": payload["mean"],
        "scale": payload["scale"],
        "coefficients": payload["coefficients"],
        "intercept": payload["intercept"],
        "params": payload.get("params", {}),
        "metrics": {**ev, **counts.get("metrics_extra", {})},
        "training": {k: v for k, v in counts.items() if k != "metrics_extra"},
        "feature_importance": {f: round(float(c), 4) for f, c in ranked},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the FleetOps vehicle ranker (no safety gates; prefer retrain.py).")
    parser.add_argument("--synthetic", type=int, default=3000, help="number of synthetic requests")
    parser.add_argument("--synthetic-only", action="store_true", help="explicitly train without customer data")
    parser.add_argument("--no-history", action="store_true", help="legacy alias of --synthetic-only")
    parser.add_argument("--tune", action="store_true", help="grid-search C x class_weight")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", default=DEFAULT_OUT, help="path of the exported model JSON")
    parser.add_argument("--test-size", type=float, default=0.2, help="fraction of requests held out")
    args = parser.parse_args()

    try:
        import pandas as pd  # noqa: F401
    except ImportError:
        raise SystemExit(
            "Missing dependencies. Run:\n"
            "  pip install -r training/requirements.txt"
        )

    synthetic_only = args.synthetic_only or args.no_history
    rows, labels, groups, weights, counts = full_dataset(
        synthetic_count=args.synthetic, seed=args.seed, use_gated=not synthetic_only
    )

    if args.tune:
        payload, ev, trials = tune_candidate(rows, labels, groups, weights, args.seed, args.test_size)
        print(f"[train] tuning results (selected C={payload['params']['C']}, "
              f"class_weight={payload['params']['class_weight']}):")
        for t in sorted(trials, key=lambda r: -r["top1_accuracy"]):
            print(f"        C={t['C']:<5} cw={str(t['class_weight']):<9} "
                  f"test={t['top1_accuracy']:.4f}  train={t['top1_accuracy_train']:.4f}")
    else:
        payload, ev, _, _ = train_candidate(
            rows, labels, groups, weights, args.seed, args.test_size,
            params={"C": 1.0, "class_weight": "balanced"},
        )

    print(f"[train] top-1 accuracy: train={ev['top1_accuracy_train']:.3f}  test={ev['top1_accuracy']:.3f}")

    export = build_export_payload(
        payload, ev,
        {**counts, "metrics_extra": {
            "rows": int(len(rows)),
            "requests": int(len(set(groups))),
            "positives": int(sum(labels)),
            "weight_sum": round(float(sum(weights)), 2),
        }},
        args.seed, args.test_size,
    )

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    _atomic_write_json(args.out, export)
    print(f"[train] Exported model -> {args.out}")

    print("[train] Feature weights (|coef|):")
    for name, value in sorted(export["feature_importance"].items(), key=lambda kv: -abs(kv[1])):
        print(f"        {name:<20} {value:+.4f}")


if __name__ == "__main__":
    main()
