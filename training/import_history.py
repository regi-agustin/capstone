"""
Import real reservation history (CSV / Excel) into MySQL for gated training.

    python training/import_history.py training/samples/reservations_template.csv
    python training/import_history.py history.xlsx --dry-run
    python training/import_history.py export.csv --encoding cp1252

What it does:
  * flexible header matching (case/space insensitive aliases)
  * resolves vehicles by id / car_code / plate_number (or a unique type name)
  * creates missing clients (matched by email first, then by name)
  * writes reservations (status default 'completed'), optional 1-5 ratings
    into feedback, and stores preferred vehicle type as a
    'preferred_type=X' token in special_requests (parsed by training/gate.py)
  * idempotent: rows matching (client, dates, vehicle) are skipped
  * touches api/model/retrain.requested so --if-needed picks the data up

Operator-vouched data: imported converted rows are eligible for both gate
lanes on the next gate run (see training/gate.py for the rules).

Formats: .csv, .xlsx/.xls (requires openpyxl -> training/requirements.txt)
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import datetime, timezone

TRAINING_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(TRAINING_DIR)
sys.path.insert(0, TRAINING_DIR)

from dataset import _read_db_config  # noqa: E402

FLAG_FILE = os.path.join(PROJECT_DIR, "api", "model", "retrain.requested")
TEMPLATE = os.path.join(TRAINING_DIR, "samples", "reservations_template.csv")

_DATE_RE = re.compile(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$")

# canonical field -> accepted header aliases (normalized: lower, _ for spaces/-)
ALIASES: dict[str, tuple[str, ...]] = {
    "start_date": ("start_date", "pickup_date", "date_from", "pick_up_date", "pickupdate", "start"),
    "end_date": ("end_date", "return_date", "date_to", "dropoff_date", "drop_off_date", "returndate", "end"),
    "passengers": ("passengers", "pax", "guests", "num_passengers", "headcount", "people", "passenger_count"),
    "vehicle": ("vehicle", "vehicle_id", "car", "car_code", "plate", "plate_number", "vehicle_code", "unit"),
    "client_name": ("client_name", "name", "customer", "customer_name", "contact_person", "full_name", "client"),
    "client_email": ("client_email", "email", "email_address", "e_mail"),
    "client_contact": ("client_contact", "contact", "contact_number", "phone", "mobile", "phone_number"),
    "luggage": ("luggage", "luggage_size", "baggage"),
    "total_amount": ("total_amount", "total", "amount", "price", "total_price", "rental_fee", "paid"),
    "preferred_type": ("preferred_type", "vehicle_type", "type", "preferred_vehicle_type", "car_type"),
    "rating": ("rating", "stars", "score"),
    "rating_comment": ("rating_comment", "comment", "review", "feedback"),
    "status": ("status", "booking_status"),
    "destination": ("destination", "trip_destination", "place", "route"),
}

REQUIRED = ("start_date", "end_date", "passengers", "vehicle")
VALID_STATUS = ("pending", "pricing_approved", "confirmed", "on_trip", "completed", "cancelled", "denied")
CONVERTED_STATUS = ("pending", "pricing_approved", "confirmed", "on_trip", "completed")
VALID_TYPES = ("AUV", "SEDAN", "L300")


def norm_header(h: str) -> str:
    return "".join("_" if c in " -/" else c for c in str(h).strip().lower()).strip("_")


def map_columns(headers) -> dict[str, str]:
    """canonical field -> actual column name present in the file."""
    normalized = {norm_header(h): h for h in headers}
    out: dict[str, str] = {}
    for field, aliases in ALIASES.items():
        for alias in aliases:
            if alias in normalized:
                out[field] = normalized[alias]
                break
    return out


def touch_flag() -> None:
    try:
        os.makedirs(os.path.dirname(FLAG_FILE), exist_ok=True)
        with open(FLAG_FILE, "w", encoding="utf-8") as fh:
            fh.write(datetime.now(timezone.utc).isoformat(timespec="seconds"))
    except OSError:
        pass


def connect():
    import pymysql

    cfg = _read_db_config()
    return pymysql.connect(
        host=cfg.get("DB_HOST", "localhost"),
        database=cfg.get("DB_NAME", "fleetops_db"),
        user=cfg.get("DB_USER", "root"),
        password=cfg.get("DB_PASS", ""),
        connect_timeout=3,
        autocommit=False,
    )


def load_fleet_lookup(conn) -> tuple[dict, dict, dict, dict]:
    with conn.cursor() as cur:
        cur.execute("SELECT vehicle_id, car_code, plate_number, vehicle_type FROM vehicles")
        rows = cur.fetchall()
    by_id, by_code, by_plate, by_type = {}, {}, {}, {}
    for vid, code, plate, vtype in rows:
        by_id[int(vid)] = int(vid)
        if code:
            by_code[str(code).strip().upper()] = int(vid)
        if plate:
            by_plate[str(plate).strip().upper()] = int(vid)
        by_type.setdefault(str(vtype).strip().upper(), []).append(int(vid))
    return by_id, by_code, by_plate, by_type


def resolve_vehicle(raw, by_id, by_code, by_plate, by_type) -> tuple[int | None, str | None]:
    token = str(raw).strip()
    if not token:
        return None, "vehicle cell is empty"
    up = token.upper()
    if up in by_code:
        return by_code[up], None
    if up in by_plate:
        return by_plate[up], None
    try:
        as_int = int(float(token))
        if as_int in by_id:
            return as_int, None
    except ValueError:
        pass
    if up in by_type:
        ids = by_type[up]
        if len(ids) == 1:
            return ids[0], None
        return None, f"vehicle type '{up}' is ambiguous ({len(ids)} vehicles) - use car_code/plate_number"
    return None, f"vehicle '{token}' not found"


def find_or_create_client(conn, name: str, email: str, contact: str, dry: bool) -> tuple[int | None, bool]:
    """-> (client_id, created?)"""
    name = (name or "").strip()
    email = (email or "").strip().lower()
    contact = (contact or "").strip()

    with conn.cursor() as cur:
        if email:
            cur.execute("SELECT client_id FROM clients WHERE LOWER(TRIM(email_address)) = %s LIMIT 1", (email,))
            row = cur.fetchone()
            if row:
                return int(row[0]), False
        if name:
            cur.execute(
                "SELECT client_id FROM clients WHERE LOWER(TRIM(company_name)) = %s "
                "   OR LOWER(TRIM(contact_person)) = %s LIMIT 1",
                (name.lower(), name.lower()),
            )
            row = cur.fetchone()
            if row:
                cid = int(row[0])
                if not dry and email:
                    cur.execute("UPDATE clients SET email_address = COALESCE(email_address, %s) WHERE client_id = %s",
                                (email, cid))
                return cid, False

        if not name:
            return None, False  # cannot identify or create a client without a name
        if dry:
            return -1, True  # placeholder for preview
        cur.execute(
            "INSERT INTO clients (user_id, company_name, contact_person, contact_number, email_address, "
            "client_type, registration_date, status) VALUES (NULL, %s, %s, %s, %s, 'individual', CURDATE(), 'active')",
            (name, name, contact or None, email or None),
        )
        return int(cur.lastrowid), True


def detect_dayfirst(series) -> bool:
    """Excel locale detection: DD/MM/YYYY vs MM/DD/YYYY.

    A component > 12 pins the order; when fully ambiguous (both <= 12) default
    to day-first — that is what Philippine Excel locales produce when they
    re-save ISO dates. If no slash-format value exists at all (clean ISO file),
    return False so pandas keeps strict ISO parsing.
    """
    first_is_day = second_is_day = matched = False
    for v in series:
        m = _DATE_RE.match(str(v).strip())
        if not m:
            continue
        matched = True
        a, b = int(m.group(1)), int(m.group(2))
        if a > 12:
            first_is_day = True
        if b > 12:
            second_is_day = True
    if not matched:
        return False  # ISO-only file
    if first_is_day and not second_is_day:
        return True
    if second_is_day and not first_is_day:
        return False
    return True  # ambiguous -> day-first (PH Excel default)


_ISO_RE = re.compile(r"^\d{4}-\d{1,2}-\d{1,2}([ T].*)?$")


def parse_date(val, dayfirst: bool = True) -> str | None:
    import pandas as pd

    # pandas dayfirst=True misreads ISO "2026-07-05" as YYYY-DD-MM; pin it.
    if isinstance(val, str) and _ISO_RE.match(val.strip()):
        dayfirst = False
    ts = pd.to_datetime(val, dayfirst=dayfirst, errors="coerce")
    if pd.isna(ts):
        return None
    return ts.strftime("%Y-%m-%d")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import reservation history (CSV/XLSX) for gated training.")
    parser.add_argument("path", help="path to .csv or .xlsx file")
    parser.add_argument("--dry-run", action="store_true", help="preview actions; write nothing")
    parser.add_argument("--encoding", default="utf-8-sig",
                        help="CSV encoding (default utf-8-sig; auto-falls back to cp1252)")
    args = parser.parse_args()

    try:
        import pandas as pd
    except ImportError:
        raise SystemExit("Missing dependencies: pip install -r training/requirements.txt")

    if not os.path.isfile(args.path):
        raise SystemExit(f"File not found: {args.path}")

    ext = os.path.splitext(args.path)[1].lower()
    if ext in (".xlsx", ".xls"):
        df = pd.read_excel(args.path)
    elif ext == ".csv":
        try:
            df = pd.read_csv(args.path, encoding=args.encoding)
        except UnicodeDecodeError:
            if args.encoding != "utf-8-sig":
                raise
            # Legacy Excel CSV exports are Windows-1252; retry before failing.
            df = pd.read_csv(args.path, encoding="cp1252")
            print("[import] note: file is not UTF-8; read as cp1252")
    else:
        raise SystemExit("Unsupported format: use .csv, .xlsx or .xls")

    if df.empty:
        raise SystemExit("The file has no data rows.")

    colmap = map_columns(df.columns)
    missing = [f for f in REQUIRED if f not in colmap]
    if missing:
        raise SystemExit(
            "Missing required columns: " + ", ".join(missing) + "\n"
            "Accepted headers (aliases): "
            + "; ".join(f"{f} <- {'/'.join(ALIASES[f])}" for f in missing)
            + f"\nSee template: {TEMPLATE}"
        )

    dayfirst = detect_dayfirst(pd.concat([df[colmap["start_date"]], df[colmap["end_date"]]]))
    print(f"[import] dates read as {'day-first (DD/MM/YYYY)' if dayfirst else 'month-first (MM/DD/YYYY)'}")

    conn = connect()
    imported = created_clients = imported_ratings = duplicates = 0
    errors: list[str] = []
    planned: list[str] = []
    try:
        by_id, by_code, by_plate, by_type = load_fleet_lookup(conn)

        for idx, row in df.iterrows():
            line = int(idx) + 2  # header is line 1
            def cell(field):
                if field not in colmap:
                    return None
                v = row[colmap[field]]
                if pd.isna(v):
                    return None
                return v

            start = parse_date(cell("start_date"), dayfirst)
            end = parse_date(cell("end_date"), dayfirst)
            if not start or not end:
                errors.append(f"line {line}: invalid or missing dates ({cell('start_date')!r} -> {cell('end_date')!r})")
                continue
            if end < start:
                errors.append(f"line {line}: end_date {end} before start_date {start}")
                continue

            try:
                pax = int(float(cell("passengers") or 0))
            except (TypeError, ValueError):
                errors.append(f"line {line}: passengers not numeric ({cell('passengers')!r})")
                continue
            if pax < 1:
                errors.append(f"line {line}: passengers must be >= 1")
                continue

            vid, verr = resolve_vehicle(cell("vehicle"), by_id, by_code, by_plate, by_type)
            if vid is None:
                errors.append(f"line {line}: {verr or 'vehicle unresolved'}")
                continue

            status = str(cell("status") or "completed").strip().lower().replace(" ", "_")
            if status not in VALID_STATUS:
                status = "completed"

            name = str(cell("client_name") or "").strip()
            email = str(cell("client_email") or "").strip()
            contact = str(cell("client_contact") or "").strip()
            if not name and not email:
                errors.append(f"line {line}: need client_name or client_email")
                continue

            # duplicate check (client resolved below; dates+vehicle first)
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT r.reservation_id FROM reservations r JOIN clients c ON c.client_id = r.client_id "
                    "WHERE r.start_date = %s AND r.end_date = %s AND r.vehicle_id = %s "
                    "  AND (LOWER(TRIM(c.email_address)) = %s OR LOWER(TRIM(c.company_name)) = %s) LIMIT 1",
                    (start, end, vid, email.lower(), name.lower()),
                )
                if cur.fetchone():
                    duplicates += 1
                    continue

            cid, was_created = find_or_create_client(conn, name, email, contact, args.dry_run)
            if cid is None:
                errors.append(f"line {line}: cannot resolve client ({name!r}/{email!r})")
                continue

            total = cell("total_amount")
            try:
                total = round(float(total), 2) if total is not None else 0.0
            except (TypeError, ValueError):
                total = 0.0

            pref = str(cell("preferred_type") or "").strip().upper()
            if pref and pref not in VALID_TYPES:
                pref = ""
            special = f"preferred_type={pref}" if pref else None
            luggage = str(cell("luggage") or "").strip() or None
            destination = str(cell("destination") or "").strip() or None

            planned.append(f"line {line}: {name or email} {start}->{end} pax={pax} vehicle#{vid}"
                           + (f" status={status}" if status != "completed" else "")
                           + (f" pref={pref}" if pref else "")
                           + (" [new client]" if was_created else ""))
            if args.dry_run:
                if was_created:
                    created_clients += 1
                imported += 1
                r = cell("rating")
                if r is not None:
                    try:
                        ri = int(float(r))
                        if 1 <= ri <= 5:
                            imported_ratings += 1
                    except (TypeError, ValueError):
                        pass
                continue

            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO reservations (client_id, vehicle_id, start_date, end_date, destination, "
                    "passengers, luggage, special_requests, status, total_amount, additional_charges) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0)",
                    (cid, vid, start, end, destination, pax, luggage, special, status, total),
                )
                rid = int(cur.lastrowid)
                cur.execute(
                    'UPDATE reservations SET trip_code = CONCAT("BK-", YEAR(start_date), "-", LPAD(%s, 4, "0")) '
                    "WHERE reservation_id = %s",
                    (rid, rid),
                )
            if was_created:
                created_clients += 1
            imported += 1

            rating = cell("rating")
            if rating is not None:
                try:
                    r = int(float(rating))
                    if 1 <= r <= 5:
                        comment = str(cell("rating_comment") or "").strip() or None
                        with conn.cursor() as cur:
                            cur.execute(
                                "INSERT INTO feedback (user_id, reservation_id, rating, comment) "
                                "VALUES (NULL, %s, %s, %s)",
                                (rid, r, comment),
                            )
                        imported_ratings += 1
                except (TypeError, ValueError):
                    pass

        if args.dry_run:
            conn.rollback()
        else:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    for p in planned[:20]:
        print(f"[import] {p}")
    if len(planned) > 20:
        print(f"[import] ... and {len(planned) - 20} more rows")
    for e in errors[:20]:
        print(f"[import] ERROR {e}")
    if len(errors) > 20:
        print(f"[import] ... and {len(errors) - 20} more errors")

    print(f"[import] {'WOULD import' if args.dry_run else 'imported'}={imported} "
          f"new_clients={created_clients} ratings={imported_ratings} duplicates_skipped={duplicates} "
          f"errors={len(errors)}")
    if args.dry_run:
        print("[import] dry run - nothing written.")
        return
    if imported:
        touch_flag()
        print(f"[import] flagged retrain -> {FLAG_FILE}")
        print("[import] next: python training/retrain.py   (gate -> train -> evaluate -> deploy if safe)")


if __name__ == "__main__":
    main()
