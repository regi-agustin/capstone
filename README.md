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

## Always-on hosting (InfinityFree — free, runs without your PC)

Cloudflare tunnels only work while your computer is on. For a permanent link, host the app on
InfinityFree (free PHP 8 + MySQL + phpMyAdmin):

1. Sign up at **infinityfree.com** and create a new project → pick a subdomain
   (e.g. `fleetops.infinityfreeapp.com`).
2. In their control panel, create a MySQL database. Note the values they give you
   (host like `sqlxxx.infinityfree.com`, database name, username, password).
3. Import **`fleetops_db_remote.sql`** (a version of the dump with the
   `CREATE DATABASE`/`USE` lines stripped — their host assigns the DB name) via their phpMyAdmin.
4. Build the frontend: `npm install` then `npm run build`.
5. Upload to your project's `htdocs`:
   - the contents of `dist/` (frontend), and
   - the `api/` folder, and
   - the `.htaccess` file (SPA routing so subroutes like `/payroll` don't 404 on refresh).
6. Edit `api/config.php` on the server with their database credentials
   (host, name, user, pass) and set your PHP version to 8.x in their control panel.
7. Open your subdomain — it's live 24/7. Share the link.

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

Note: the latest SQL dump marks most demo accounts as archived (inactive). Log in as
`admin` / `admin123` and use the **Archive** dashboard to restore them.

## Troubleshooting

- **404 on API calls** — the `api/` folder is not inside `htdocs\fleetops\` (step 2), or you changed the folder name without updating `vite.config.js`.
- **Database connection errors** — fix `api/config.php` credentials.
- **Blank page** — the frontend must be served from the same origin as `/api` (Option B), or use the dev proxy (Option A).