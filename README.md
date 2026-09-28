# FleetOps

An AI-Driven Fleet Operations System for Hollydot Car Rental — React + Vite frontend, PHP + MySQL API.

## What's in the repo

| Path | What it is |
|---|---|
| `api/` | PHP backend. Must be served by Apache (see Setup). |
| `fleetops_db.sql` | Full database dump (schema + data). Import via phpMyAdmin. |
| `src/` | React frontend source. |
| `dist/` | Production build output (generated, not committed). |

## Prerequisites (XAMPP recommended)

- XAMPP with Apache + MySQL + PHP 8.x running
- Node.js 18+ (only needed to build/run the frontend)

## Setup (do all steps)

> **Quick start after `git clone`:** install XAMPP (Apache + MySQL + PHP) and Node.js, then
> double-click `setup.bat` from the repo root. It copies `api/` into `C:\xampp\htdocs\fleetops\api\`,
> imports `fleetops_db.sql`, and runs `npm install`. Then start Apache + MySQL in XAMPP and run
> `npm run dev`. (Manual steps below if you prefer to do it yourself.)

### 1. Database

Open phpMyAdmin (`http://localhost/phpmyadmin`) → **Import** → choose `fleetops_db.sql` → Go.
The file creates the `fleetops_db` database, all tables, and seed data.

### 2. Backend (this is the part that fixes 404s)

Copy the `api/` folder from the repo into your web server's document root:

```
C:\xampp\htdocs\fleetops\api\
```

Verify: open `http://localhost/fleetops/api/login.php` — you should see a JSON error
(`{"error":"Method not allowed."}` or similar), **not** an Apache 404.

If your MySQL root user has a password, edit `api/config.php`:

```php
define('DB_PASS', 'your-password');
```

### 3. Frontend — pick one

**Option A — Dev server (quick, recommended for development):**

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api` → `http://localhost/fleetops/api`.
(If you copied the backend to a different folder name, e.g. `htdocs/MyFleet`, change the
`proxy.rewrite` target in `vite.config.js` accordingly.)

**Option B — Production build served by Apache:**

```bash
npm install
npm run build
```

Copy the contents of `dist/` into `C:\xampp\htdocs\fleetops\` (same folder that contains `api/`),
then open `http://localhost/fleetops/`.

## Login

All demo accounts (see `fleetops_db.sql`):

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Super Admin |
| `miggy.basina` | `fleetops123` | Driver Mgmt Head |
| `elena.reyes` | `rental2026` | Reservation Officer |
| `macasinag` | `billing2026` | Billing Officer |
| `maria.santos` | `payroll2026` | Payroll Officer |
| `charles.buque` | `customer2026` | Customer |
| `juan.driver` | `driver123` | Driver |
| `pedro.santos` | `driver123` | Driver |
| `ana.cruz` | `driver123` | Driver |
| `miguel.lopez` | `driver123` | Driver |
| `rosa.mendoza` | `driver123` | Driver |
| `sherwin.aspa` | `driver123` | Driver |

Note: the latest SQL dump marks most demo accounts as archived (inactive). Log in as
`admin` / `admin123` and use the **Archive** dashboard to restore them. Each driver record
in the DMH **Drivers** page has a matching login account above (password `driver123`).

## Payroll module (workflow demo)

The payroll desk is a multi-step process: **Draft → For Review → Approved → Paid**, with
**Cancelled** and **Return for Correction** on the side. Login as `maria.santos` / `payroll2026`
and open **Payroll → Payroll Processing**.

Demo data included:

- Driver **Sherwin Aspa**, plate **NBX8012**, vehicles 11–17, and 8 completed trips inside the
  **July 1–15, 2026** cut-off.
- Payroll **#6** shows the finished worked example exactly: rental ₱14,630 + OT ₱540 + toll/parking
  ₱1,174 → earnings ₱16,344; 2% WTAX ₱34.28 + Coop Savings ₱1,000 + Coop Loan ₱2,500 →
  deductions ₱3,534.28; **net ₱12,809.72**, fully **paid** with an imprintable payslip.

To replay the flow step by step in the wizard, first clear the pre-seeded result:

```sql
DELETE FROM payroll_trips WHERE payroll_id = 6;
DELETE FROM payroll WHERE payroll_id = 6;
```

Then use **Create Payroll** (pick the July 1–15 cut-off → Sherwin Aspa → verify trips → earnings →
deductions → submit). Note the wizard loads trips with OT/Toll/Parking at ₱0 for verification —
enter 315/90/135 OT across the three overtime days and tolls 146/382/596 + parking 50 to reproduce
the exact ₱12,809.72.

## Troubleshooting

- **404 on API calls** — the `api/` folder is not inside `htdocs\fleetops\` (step 2), or you changed the folder name without updating `vite.config.js`.
- **Database connection errors** — fix `api/config.php` credentials.
- **Blank page** — the frontend must be served from the same origin as `/api` (Option B), or use the dev proxy (Option A).