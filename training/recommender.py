"""
Hybrid recommender trainer for FleetOps: Collaborative Filtering (weighted
ALS matrix factorization)
+ Content-Based interaction weights. Exports api/model/recommender.json for
api/ai_assistant.php.

    python training/recommender.py                          # real data -> api/model/recommender.json
    python training/recommender.py --simulate 600 --out /tmp/recommender_sim.json
                                                            # synthetic histories, algorithm validation

Collaborative filtering: weighted Alternating Least Squares matrix
factorization (SVD-style MF — closed-form ridge steps, converges reliably
where plain SGD stalls):
    r_hat(u,i) = global_mean + b_u + b_i + dot(p_u, q_i)
Values are normalized to [0,1]. Explicit feedback ratings (feedback table,
1-5) are strong evidence; bookings without a rating are implicit positives.

Content-based: per-client interaction weights are exported; vehicle content
vectors are computed LIVE by PHP from the current fleet, so CB never goes
stale when vehicles change (same principle as the request-based ranker).

Sparsity guardrail: status is "insufficient_data" until there are enough
interactions for CF to mean anything; PHP then serves content-based +
request scoring only. No synthetic user history is ever written to the
production export — simulation requires an explicit --simulate/--out pair.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import re
from datetime import datetime, timezone

import numpy as np

TRAINING_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(TRAINING_DIR)
CONFIG_PHP = os.path.join(PROJECT_DIR, "api", "config.php")
DEFAULT_OUT = os.path.join(PROJECT_DIR, "api", "model", "recommender.json")
GATED_DEFAULT = os.path.join(PROJECT_DIR, "api", "model", "gated_examples.json")


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

# CF guardrail: below these the matrix is too sparse to factorize honestly.
MIN_ENTRIES = 30
MIN_CLIENTS = 5
MIN_VEHICLES = 5

# ALS matrix-factorization hyperparameters (validated by --simulate:
# held-out RMSE beats the predict-mean baseline, MRR/HR@3 beat random)
MF_K = 4
MF_LAMBDA_F = 0.5       # ridge on latent factors
MF_LAMBDA_B = 1.0       # ridge on biases
MF_ITERS = 60

# Interaction weighting (values live in [0, 1]; 1.0 == 5 stars)
IMPLICIT_VALUE = 0.70       # a booking without a rating: positive, not a rave
IMPLICIT_WEIGHT = 1.00      # per booking, capped below for repeats
REPEAT_CAP = 3.0
EXPLICIT_WEIGHT = 2.00      # a real 1-5 rating outweighs a bare booking

HOLDOUT = 0.2
SEED = 42


def _read_db_config() -> dict:
    with open(CONFIG_PHP, "r", encoding="utf-8") as fh:
        text = fh.read()
    cfg = {}
    for key in ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASS"):
        m = re.search(rf"define\(\s*'{key}'\s*,\s*'([^']*)'\s*\)", text)
        if m:
            cfg[key] = m.group(1)
    return cfg


def _connect():
    import pymysql

    cfg = _read_db_config()
    return pymysql.connect(
        host=cfg.get("DB_HOST", "localhost"),
        database=cfg.get("DB_NAME", "fleetops_db"),
        user=cfg.get("DB_USER", "root"),
        password=cfg.get("DB_PASS", ""),
        connect_timeout=3,
        read_timeout=10,
    )


def load_fleet():
    """-> (vehicle_ids, {id: content_vector}) content vectors for CB/eval."""
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT vehicle_id, vehicle_type, seats, COALESCE(luggage_capacity, 0), daily_rate, year FROM vehicles"
            )
            rows = cur.fetchall()
    finally:
        conn.close()
    fleet = {}
    for vid, vtype, seats, luggage, rate, year in rows:
        fleet[int(vid)] = {
            "type": str(vtype),
            "seats": int(seats),
            "luggage": int(luggage),
            "rate": float(rate),
            "year": int(year),
        }
    print(f"[recommender] Loaded {len(fleet)} vehicles.")
    return fleet


def content_vector(v: dict, max_rate: float) -> list[float]:
    """Same semantics as ai_content_vector() in api/ai_assistant.php."""
    vec = [
        1.0 if v["type"] == "AUV" else 0.0,
        1.0 if v["type"] == "SEDAN" else 0.0,
        1.0 if v["type"] == "L300" else 0.0,
        min(1.0, v["seats"] / 18.0),
        min(1.0, v["luggage"] / 16.0),
        min(1.0, v["rate"] / max(max_rate, 1.0)),
        max(0.0, min(1.0, (v["year"] - 2010) / 15.0)),
    ]
    n = math.sqrt(sum(x * x for x in vec))
    return [x / n for x in vec] if n > 0 else vec


def merge_interactions(bookings, ratings):
    """Single source of truth for Lane B weighting (used by DB and gated paths).

    bookings: iterable of (client_id, vehicle_id, booking_count)
    ratings:  iterable of (client_id, vehicle_id, rating 1-5)
    -> (merged { (u,i): {"value","weight"} }, counts)
    """
    merged: dict[tuple[int, int], dict] = {}
    for cid, vid, count in bookings:
        if cid is None or vid is None:
            continue
        key = (int(cid), int(vid))
        weight = min(REPEAT_CAP, IMPLICIT_WEIGHT * max(1, int(count)))
        merged[key] = {"value": IMPLICIT_VALUE, "weight": weight}
    n_ratings = 0
    for cid, vid, rating in ratings:
        if cid is None or vid is None:
            continue
        n_ratings += 1
        key = (int(cid), int(vid))
        value = max(0.0, min(1.0, (float(rating) - 1.0) / 4.0))
        if key in merged:
            w0, v0 = merged[key]["weight"], merged[key]["value"]
            w1 = EXPLICIT_WEIGHT
            merged[key] = {"value": (v0 * w0 + value * w1) / (w0 + w1), "weight": w0 + w1}
        else:
            merged[key] = {"value": value, "weight": EXPLICIT_WEIGHT}

    counts = {
        "interactions": len(merged),
        "clients": len({c for c, _ in merged}),
        "vehicles": len({v for _, v in merged}),
        "ratings": n_ratings,
        "bookings": int(sum(c for _, _, c in bookings)),
    }
    return merged, counts


def load_interactions():
    """Returns ({(client_id, vehicle_id): {"value": 0..1, "weight": >0}}, counts).

    Reads converted-booking facts + explicit ratings straight from MySQL.
    The gate export (--gated) is the preferred path; this raw path queries the
    exact same Lane B facts (bookings + ratings only, never a choice label).
    """
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT r.client_id, r.vehicle_id, COUNT(*) "
                "  FROM reservations r "
                " WHERE r.vehicle_id IS NOT NULL AND r.client_id IS NOT NULL "
                "   AND r.status NOT IN ('denied', 'cancelled') "
                " GROUP BY r.client_id, r.vehicle_id"
            )
            bookings = cur.fetchall()
            cur.execute(
                "SELECT COALESCE(r.client_id, c.client_id), r.vehicle_id, f.rating "
                "  FROM feedback f "
                "  JOIN reservations r ON r.reservation_id = f.reservation_id "
                "  LEFT JOIN clients c ON c.user_id = f.user_id "
                " WHERE r.vehicle_id IS NOT NULL AND r.client_id IS NOT NULL "
                "   AND r.status NOT IN ('denied', 'cancelled')"
            )
            ratings = cur.fetchall()
    finally:
        conn.close()

    merged, counts = merge_interactions(bookings, ratings)
    print(f"[recommender] Interactions (db): {counts}")
    return merged, counts


def load_gated_interactions(path: str):
    """Lane B signal from the training-gate export (bookings + ratings lists).

    Fails closed: a missing/unreadable gate export is an error, never an
    implicit fall back to ungated data.
    """
    with open(path, "r", encoding="utf-8") as fh:
        payload = json.load(fh)
    bookings = [tuple(x) for x in payload.get("bookings", [])]
    ratings = [tuple(x) for x in payload.get("ratings", [])]
    merged, counts = merge_interactions(bookings, ratings)
    counts["source"] = "gated"
    counts["gated_generated_at"] = payload.get("generated_at")
    print(f"[recommender] Interactions (gated {payload.get('generated_at')}): {counts}")
    return merged, counts


# ---------------------------------------------------------------------------
# Matrix factorization (weighted ALS)
# ---------------------------------------------------------------------------

def _als_fit(pairs, entries, k=MF_K, lam_f=MF_LAMBDA_F, lam_b=MF_LAMBDA_B,
             iters=MF_ITERS, seed=SEED):
    """Weighted ridge alternating least squares on observed pairs only.

    Closed-form ridge steps converge reliably (plain SGD on this objective
    stalls far from the optimum). Returns a predict(u, i) closure + params.
    """
    user_ids = sorted({u for u, _ in pairs})
    item_ids = sorted({i for _, i in pairs})
    u_idx = {u: idx for idx, u in enumerate(user_ids)}
    i_idx = {i: idx for idx, i in enumerate(item_ids)}
    w_of = {p: float(entries[p]["weight"]) for p in pairs}
    v_of = {p: float(entries[p]["value"]) for p in pairs}
    total_w = sum(w_of.values()) or 1.0
    mean = sum(w_of[p] * v_of[p] for p in pairs) / total_w

    b_u = np.zeros(len(user_ids))
    b_i = np.zeros(len(item_ids))
    rs = np.random.RandomState(seed)
    P = rs.normal(0, 0.1, size=(len(user_ids), k))
    Q = rs.normal(0, 1.0 / math.sqrt(k), size=(len(item_ids), k))

    obs_u = {idx: [] for idx in range(len(user_ids))}
    obs_i = {idx: [] for idx in range(len(item_ids))}
    for (u, i) in pairs:
        obs_u[u_idx[u]].append(i_idx[i])
        obs_i[i_idx[i]].append(u_idx[u])
    eye = np.eye(k)

    for _ in range(iters):
        for ui, items_k in obs_u.items():
            if not items_k:
                continue
            w = np.array([w_of[(user_ids[ui], item_ids[ii])] for ii in items_k])
            r = np.array([v_of[(user_ids[ui], item_ids[ii])] - mean - b_i[ii] for ii in items_k])
            A = Q[items_k]
            P[ui] = np.linalg.solve(A.T @ (A * w[:, None]) + lam_f * eye, A.T @ (w * r))
        for ii, users_k in obs_i.items():
            if not users_k:
                continue
            w = np.array([w_of[(user_ids[u], item_ids[ii])] for u in users_k])
            r = np.array([v_of[(user_ids[u], item_ids[ii])] - mean - b_u[u] for u in users_k])
            A = P[users_k]
            Q[ii] = np.linalg.solve(A.T @ (A * w[:, None]) + lam_f * eye, A.T @ (w * r))
        for ui, items_k in obs_u.items():
            if not items_k:
                continue
            num = sum(
                w_of[(user_ids[ui], item_ids[ii])]
                * (v_of[(user_ids[ui], item_ids[ii])] - mean - b_i[ii] - float(P[ui] @ Q[ii]))
                for ii in items_k
            )
            den = lam_b + sum(w_of[(user_ids[ui], item_ids[ii])] for ii in items_k)
            b_u[ui] = num / den
        for ii, users_k in obs_i.items():
            if not users_k:
                continue
            num = sum(
                w_of[(user_ids[u], item_ids[ii])]
                * (v_of[(user_ids[u], item_ids[ii])] - mean - b_u[u] - float(P[u] @ Q[ii]))
                for u in users_k
            )
            den = lam_b + sum(w_of[(user_ids[u], item_ids[ii])] for u in users_k)
            b_i[ii] = num / den

    def predict(u, i):
        if u not in u_idx or i not in i_idx:
            return mean
        return mean + b_u[u_idx[u]] + b_i[i_idx[i]] + float(P[u_idx[u]] @ Q[i_idx[i]])

    return {
        "mean": mean,
        "predict": predict,
        "user_ids": user_ids,
        "item_ids": item_ids,
        "P": P,
        "Q": Q,
        "b_u": b_u,
        "b_i": b_i,
    }


def train_mf(entries: dict, vehicle_ids: list, rng: random.Random | None = None):
    """entries: {(u,i): {"value", "weight"}} -> export section with metrics.

    Evaluation: fixed 20% hold-out. RMSE must beat the predict-mean baseline;
    MRR/HR@3 (first held-out item per client, ranked against the whole fleet)
    must beat random. HR@1 is deliberately not reported — with several
    near-equal acceptable vehicles per client even an oracle scores ~random.
    """
    pairs = list(entries.keys())
    metrics: dict = {"entries": len(pairs)}

    split_rs = np.random.RandomState(SEED)
    perm = split_rs.permutation(len(pairs))
    n_test = max(1, int(len(pairs) * HOLDOUT)) if len(pairs) >= 10 else 0
    test_t = set(int(t) for t in perm[:n_test].tolist())
    train_pairs = [p for t, p in enumerate(pairs) if t not in test_t]

    if n_test and len(train_pairs) >= 5:
        model = _als_fit(train_pairs, entries)
        sq_err = sq_base = 0.0
        for t in sorted(test_t):
            u, i = pairs[t]
            target = entries[(u, i)]["value"]
            sq_err += (target - model["predict"](u, i)) ** 2
            sq_base += (target - model["mean"]) ** 2
        metrics["rmse"] = round(math.sqrt(sq_err / len(test_t)), 4)
        metrics["baseline_rmse"] = round(math.sqrt(sq_base / len(test_t)), 4)

        mrr_sum = hr3_sum = n_users = 0
        for u in sorted({pairs[t][0] for t in test_t}):
            held = [pairs[t] for t in test_t if pairs[t][0] == u]
            if not held:
                continue
            target_item = held[0][1]
            scores = sorted(((model["predict"](u, i), i) for i in vehicle_ids), reverse=True)
            rank = next((n for n, (_, i) in enumerate(scores, 1) if i == target_item), len(scores))
            mrr_sum += 1.0 / rank
            hr3_sum += int(rank <= 3)
            n_users += 1
        if n_users:
            metrics["mrr"] = round(mrr_sum / n_users, 4)
            metrics["hr_at_3"] = round(hr3_sum / n_users, 4)

    final = _als_fit(pairs, entries)
    users = {
        str(u): {
            "bias": round(float(final["b_u"][k]), 6),
            "factors": [round(float(x), 6) for x in final["P"][k]],
        }
        for k, u in enumerate(final["user_ids"])
    }
    vehicles = {
        str(i): {
            "bias": round(float(final["b_i"][k]), 6),
            "factors": [round(float(x), 6) for x in final["Q"][k]],
        }
        for k, i in enumerate(final["item_ids"])
    }
    return {
        "k": MF_K,
        "lambda_f": MF_LAMBDA_F,
        "lambda_b": MF_LAMBDA_B,
        "iters": MF_ITERS,
        "global_mean": round(float(final["mean"]), 6),
        "users": users,
        "vehicles": vehicles,
        "metrics": metrics,
    }


# ---------------------------------------------------------------------------
# Safety gate E3b: content-based generalization holdout
# ---------------------------------------------------------------------------

def cb_holdout(entries: dict, fleet: dict, max_rate: float, seed: int = SEED) -> dict:
    """Hold out one interaction per multi-interaction client and rank the whole
    fleet by content similarity between the held-out vehicle and the weighted
    content centroid of the client's remaining interactions.

    HR@3 must beat random selection (3/fleet), otherwise status='invalid' and
    the caller must stop exporting CB weights (ranker/CF unaffected).
    """
    by_client: dict[int, dict[int, float]] = {}
    for (cid, vid), e in entries.items():
        by_client.setdefault(cid, {})[vid] = e["weight"]

    n_veh = len(fleet)
    eligible = {c: m for c, m in by_client.items() if len(m) >= 2}
    out: dict = {
        "clients": len(by_client),
        "eligible_clients": len(eligible),
        "evaluated": 0,
        "fleet": n_veh,
        "random_hr_at_3": round(min(1.0, 3.0 / n_veh), 4) if n_veh else None,
    }
    if n_veh < 3 or len(eligible) < 2:
        out["status"] = "insufficient_data"
        return out

    contents = {vid: np.asarray(content_vector(v, max_rate), dtype=float) for vid, v in fleet.items()}

    def cosine(a, b) -> float:
        na, nb = float(np.linalg.norm(a)), float(np.linalg.norm(b))
        return float(a @ b) / (na * nb) if na > 0 and nb > 0 else 0.0

    rng = random.Random(seed)
    hits = 0
    rr_sum = 0.0
    for cid in sorted(eligible):
        weights = eligible[cid]
        held = rng.choice(sorted(weights))
        rest = {v: w for v, w in weights.items() if v != held}
        total = sum(rest.values()) or 1.0
        centroid = np.zeros_like(contents[held])
        for v, w in rest.items():
            centroid += (w / total) * contents[v]
        scores = sorted(((cosine(centroid, contents[v]), v) for v in sorted(fleet)), reverse=True)
        rank = next((n for n, (_, v) in enumerate(scores, 1) if v == held), len(scores))
        rr_sum += 1.0 / rank
        hits += int(rank <= 3)
        out["evaluated"] += 1

    hr3 = hits / out["evaluated"]
    out["hr_at_3"] = round(hr3, 4)
    out["mrr"] = round(rr_sum / out["evaluated"], 4)
    out["status"] = "ok" if hr3 > float(out["random_hr_at_3"]) else "invalid"
    return out


# ---------------------------------------------------------------------------
# Simulation (algorithm validation only — never the production export)
# ---------------------------------------------------------------------------

def make_simulated_entries(fleet: dict, count: int, rng: random.Random):
    """Synthetic clients with latent type/rate tastes so SVD has structure to find.

    Choices use a soft temperature and values a gentle tanh so clients spread
    across several vehicles with varied ratings — a learnable matrix, unlike
    a degenerate one where everyone only ever books their single favorite.
    """
    vehicle_ids = sorted(fleet)
    max_rate = max(v["rate"] for v in fleet.values()) if fleet else 1.0
    contents = {vid: content_vector(v, max_rate) for vid, v in fleet.items()}
    k_true = 4
    latent_vehicle = {
        vid: np.array([rng.gauss(0, 1) for _ in range(k_true)] + [contents[vid][0], contents[vid][1], contents[vid][2]])
        for vid in vehicle_ids
    }
    entries: dict[tuple[int, int], dict] = {}
    for client in range(1, count + 1):
        pref = np.array([rng.gauss(0, 1) for _ in range(k_true + 3)])
        affinities = {vid: float(pref @ latent_vehicle[vid]) for vid in vehicle_ids}
        # Softmax with a wide temperature: clients rent a mix of favorites and
        # occasional alternatives instead of always their single top pick.
        weights = {vid: math.exp(affinities[vid] / 6.0) for vid in vehicle_ids}
        n = rng.randint(8, 16)
        chosen = rng.choices(vehicle_ids, weights=[weights[v] for v in vehicle_ids], k=n)
        for vid in chosen:
            value = max(
                0.05,
                min(0.95, 0.5 + 0.3 * math.tanh(affinities[vid] / 3.0) + rng.gauss(0, 0.05)),
            )
            key = (client, vid)
            if key in entries:
                entries[key]["value"] = (entries[key]["value"] + value) / 2
                entries[key]["weight"] = min(REPEAT_CAP, entries[key]["weight"] + 0.5)
            else:
                entries[key] = {"value": value, "weight": IMPLICIT_WEIGHT}
    print(f"[recommender] Simulated {len(entries)} interactions over {count} clients.")
    return entries


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Train the FleetOps CF+CB recommender.")
    parser.add_argument("--simulate", type=int, default=0, help="generate N simulated clients (validation only)")
    parser.add_argument("--out", default=DEFAULT_OUT, help="path of the exported model JSON")
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument(
        "--gated", nargs="?", const=GATED_DEFAULT, default=None, metavar="PATH",
        help="read Lane B interactions from the training-gate export (default path used when flag given)",
    )
    parser.add_argument("--no-gated", action="store_true", help="read facts from MySQL instead of the gate export")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    try:
        fleet = load_fleet()
        if not fleet:
            raise RuntimeError("empty fleet")
    except Exception as exc:  # noqa: BLE001
        from dataset import FALLBACK_FLEET

        fleet = {
            v.vehicle_id: {"type": v.vehicle_type, "seats": v.seats, "luggage": v.luggage_capacity,
                           "rate": v.daily_rate, "year": v.year}
            for v in FALLBACK_FLEET
        }
        print(f"[recommender] MySQL unavailable ({exc.__class__.__name__}); demo fleet. {len(fleet)} vehicles.")

    max_rate = max((v["rate"] for v in fleet.values()), default=1.0)

    if args.simulate:
        entries = make_simulated_entries(fleet, args.simulate, rng)
        counts = {
            "interactions": len(entries),
            "clients": len({c for c, _ in entries}),
            "vehicles": len({i for _, i in entries}),
            "ratings": 0,
            "bookings": len(entries),
            "source": "simulated",
        }
    else:
        # Gate export preferred (single audited pipeline); --no-gated reads the
        # same Lane B facts directly from MySQL (bookings + ratings only).
        gated_path = args.gated
        if gated_path is None and not args.no_gated and os.path.isfile(GATED_DEFAULT):
            gated_path = GATED_DEFAULT
        try:
            if gated_path:
                if not os.path.isfile(gated_path):
                    raise SystemExit(f"[recommender] Gate export missing: {gated_path} (run training/gate.py)")
                entries, counts = load_gated_interactions(gated_path)
            else:
                if not args.no_gated:
                    print("[recommender] No gate export found; reading facts from MySQL (--no-gated).")
                entries, counts = load_interactions()
        except SystemExit:
            raise
        except Exception as exc:  # noqa: BLE001
            print(f"[recommender] MySQL unavailable ({exc.__class__.__name__}); no interactions.")
            entries, counts = {}, {"interactions": 0, "clients": 0, "vehicles": 0, "ratings": 0, "bookings": 0}

    cf_ok = (
        counts["interactions"] >= MIN_ENTRIES
        and counts["clients"] >= MIN_CLIENTS
        and counts["vehicles"] >= MIN_VEHICLES
    )
    cf = None
    status = "ok" if cf_ok else "insufficient_data"
    if cf_ok:
        print(f"[recommender] Training ALS matrix factorization (k={MF_K}) on {counts['interactions']} interactions...")
        cf = train_mf(entries, sorted(fleet), rng)
        m = cf["metrics"]
        print(
            f"[recommender] CF metrics: rmse={m.get('rmse')} vs baseline={m.get('baseline_rmse')}"
            f" | mrr={m.get('mrr')} | hr@3={m.get('hr_at_3')}"
        )
        # Safety gate E3a: a factorization that cannot beat the predict-mean
        # baseline is not deployed - PHP treats anything but "ok" as inactive.
        if m.get("rmse") is not None and m.get("baseline_rmse") is not None \
                and float(m["rmse"]) >= float(m["baseline_rmse"]):
            status = "invalid"
            print("[recommender] SAFETY GATE E3a FAILED: rmse did not beat baseline; CF stays OFF.")
    else:
        print(
            f"[recommender] status=insufficient_data "
            f"(need >={MIN_ENTRIES} interactions / >={MIN_CLIENTS} clients / >={MIN_VEHICLES} vehicles)."
        )

    # CB weights per client, normalized so PHP can threshold on similarity.
    cb: dict[str, dict[str, float]] = {}
    per_client: dict[int, float] = {}
    for (cid, vid), e in entries.items():
        per_client.setdefault(cid, 0.0)
        per_client[cid] += e["weight"]
    for (cid, vid), e in entries.items():
        cb.setdefault(str(cid), {})[str(vid)] = round(e["weight"] / per_client[cid], 6)

    popularity: dict[str, int] = {}
    for (_, vid) in entries:
        popularity[str(vid)] = popularity.get(str(vid), 0) + 1

    # Safety gate E3b: CB must generalize better than random, else the weights
    # are not exported (PHP then serves request-only / CF, same fail-safe as E3a).
    holdout = cb_holdout(entries, fleet, max_rate, args.seed)
    if holdout.get("status") == "invalid":
        print(
            f"[recommender] SAFETY GATE E3b FAILED: hr@3={holdout.get('hr_at_3')} "
            f"<= random={holdout.get('random_hr_at_3')}; CB stays OFF (weights not exported)."
        )
        cb = {}
    else:
        print(
            f"[recommender] CB E3b holdout: status={holdout.get('status')} "
            f"hr@3={holdout.get('hr_at_3')} random={holdout.get('random_hr_at_3')} "
            f"mrr={holdout.get('mrr')} (n={holdout.get('evaluated')})"
        )

    payload = {
        "name": "vehicle_recommender",
        "version": 1,
        "algorithm": {"cf": "als", "k": MF_K, "lambda_f": MF_LAMBDA_F, "lambda_b": MF_LAMBDA_B, "iters": MF_ITERS, "cb": "cosine_profile_weights"},
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "status": status,
        "counts": counts,
        "cf": cf,
        "cb": {"interactions": cb, "holdout": holdout},
        "vehicle_popularity": popularity,
    }

    out_path = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    _atomic_write_json(out_path, payload)
    print(f"[recommender] Exported ({status}) -> {out_path}")


if __name__ == "__main__":
    main()
