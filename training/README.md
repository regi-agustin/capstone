# Training pipeline — gated AI recommender

The rule this pipeline enforces: **a customer's choice is never assumed to be
correct.** Raw behavior must pass validate → classify → filter → admin review →
training-data gate → train → evaluate → deploy-only-if-safe before it can
influence the production models.

```
COLLECT (raw logs)  →  VALIDATE  →  CLASSIFY  →  FILTER  →  [ADMIN REVIEW]
      ↓                                                       ↓
TRAINING DATA GATE  →  TRAIN  →  EVALUATE (E1/E2/E3a)  →  DEPLOY ONLY IF SAFE
```

## Two-lane eligibility (never collapsed)

| Lane | Column | What it trains | Who sets it |
|---|---|---|---|
| **A — ranker labels** | `label_status` | the logistic ranker | gate (strict) + admin review |
| **B — CF/CB interactions** | `interaction_status` | collaborative + content-based | booking facts only |

- Only `label_status = 'eligible'` rows export as ranker examples
  (`api/model/gated_examples.json`).
- A rejected label does **not** kill Lane B: the booking still happened — only
  the *stated preference* was noise.
- **Only converted bookings can ever train.** Unconverted clicks are
  `analysis_only` forever (no manual override), `cancelled`/`denied` bookings
  kill both lanes even after human approval, and an integrity failure
  (`chosen_not_shown`, `late_choice`, unparseable payloads…) makes the label
  `rejected` permanently — human approval cannot un-corrupt data.
- Human review wins on Lane A while the fact stands; the machine may still
  downgrade a dead fact. Human-approved labels export at **0.5 weight**.

## Commands

```bash
pip install -r training/requirements.txt

python training/migrate.py                      # apply api/migrations/*.sql
python training/gate.py --status                # read-only gate summary
python training/gate.py                         # validate + classify + export
python training/import_history.py file.csv      # import history (CSV/XLSX)
python training/import_history.py file.csv --dry-run
python training/retrain.py                      # full pipeline, always run
python training/retrain.py --if-needed          # skip unless flag/new data
python training/retrain.py --dry-run            # build + evaluate, no deploy
python training/test_gate.py                    # gate branch tests (pure)
python training/eval_policy.py                  # E2 policy suite alone
```

Trainer flags: `train.py --tune --test-size 0.25 --seed N`,
`recommender.py --gated/--no-gated`, `train.py --synthetic-only` (explicit,
demo only). Synthetic data is backfill — `adaptive_synthetic` scales it down as
real gated examples grow (3000 → 2000 → 1000).

## Safety gates (all must pass to deploy)

| Gate | Rule |
|---|---|
| **E1** | candidate top-1 ≥ production − **0.01** on the *same* test split |
| **E2** | policy suite (`eval_policy.py`, 11 fixtures) → **100%** |
| **E3a** | CF rmse must beat baseline, else CF status `invalid` (CF off — **not** a deploy blocker for the ranker) |
| **E3b** | CB holdout HR@3 must beat random (3/fleet), else CB weights are not exported (CB off — **not** a deploy blocker) |

On failure the candidate is held in `api/model/pending/` and production keeps
serving the old model. On success `vehicle_ranker.json` / `recommender.json`
are replaced atomically and copied to
`C:\xampp\htdocs\fleetops\api\model\` when XAMPP is present.

## How data enters the pipeline

1. **Assistant exposures** — every AI recommendation inserts a raw
   `recommendation_logs` row (`api/ai_assistant.php`); picking a vehicle logs
   the choice and returns `logId`.
2. **Booking linkage** — booking creation sends `recommendationLogId`
   (explicit path; fallback matches client+vehicle+dates). Confirm / approve /
   deny / cancel touch `api/model/retrain.requested`.
3. **Ratings** — feedback POSTs touch the flag too.
4. **History import** — `import_history.py` (flexible header aliases, resolves
   vehicles by id/code/plate, creates clients, idempotent) writes converted
   reservations + optional 1-5 ratings and touches the flag. Template:
   `training/samples/reservations_template.csv`.
5. **Admin review** — Super Admin → *Training Data* page (approve requires a
   live conversion; HTTP 409 otherwise) or `api/training_gate.php`.

## Auto-retrain

`training/retrain.bat` wraps `retrain.py --if-needed` and appends to
`training/retrain.log`. Register with Task Scheduler:

```bat
schtasks /create /tn "FleetOps AutoRetrain" /tr "C:\Users\User\Desktop\FleetOps\training\retrain.bat" /sc daily /st 02:00
```

The run is skipped when the flag file is absent *and* the gate counts are
unchanged. The flag clears only after a completed run.

## Outputs (trainers read these exclusively)

| File | Consumer |
|---|---|
| `api/model/gated_examples.json` | `train.py` (Lane A) + `recommender.py` (Lane B) |
| `api/model/gate_report.json` | audit: counts + reason histogram |
| `api/model/vehicle_ranker.json` | `api/ai_assistant.php` request ranker |
| `api/model/recommender.json` | PHP hybrid (CF/CB), `status: insufficient_data` until 30 interactions / 5 clients / 5 vehicles |
| `api/model/pending/` | candidates that failed a gate |

Fail-closed everywhere: DB unreachable or table missing → hard error, never an
empty "pass"; exports are atomic (tmp + replace with Windows lock retries).
