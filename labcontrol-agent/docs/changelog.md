# LabControl — Changelog

A running log of all changes to the LabControl project, newest first.

## Step 21 -- Deploy Files & Folders to Lab PCs (Feature 9) . 2026-07-29

**Added multi-threaded, Fernet-encrypted file and folder directory deployment from Admin PC to target lab PCs over dedicated TCP Port 5556.**

### Added
- Dedicated TCP File Listener on port `5556` in `agent.py` supporting Fernet-encrypted 4-byte length JSON headers and 64KB binary chunk streaming.
- `file_deployer.py` module in `labcontrol-server` for concurrent file transfers across target PCs using `ThreadPoolExecutor`.
- REST API endpoint `POST /api/deploy-file` in `app.py` accepting multipart uploads (single/multiple files or `webkitdirectory` folders) and target location (`Desktop`, `Downloads`, `Documents`, or custom paths).
- `DeployFilesModal.jsx` React component with Drag & Drop, file/folder file pickers, target location selector, selected payload size summary, and per-PC live deployment status.
- `Deploy Files 📦` button (Package icon) in `ActionToolbar.jsx`.

---

## Step 20 -- Remote App Launch & Close (Feature 8) . 2026-07-29

**Added remote application execution (launch utilities like Calculator, Chrome, Notepad, CMD, custom executables) and background process termination matching process names across selected or all lab PCs.**

### Added
- Encrypted commands `launch_app` (`subprocess.Popen`) and `close_app` (`psutil.process_iter`) in `agent.py`.
- `extra_params` support in `command_sender.py` for forwarding application names and executable paths in Fernet payloads.
- REST API endpoints `POST /api/launch-app` and `POST /api/close-app` in `app.py`.
- `RemoteAppsModal.jsx` React component with quick launch presets (Calculator, Notepad, Chrome, CMD, Explorer, MS Paint), custom executable paths, quick close presets, and live execution status feed.
- `Remote Apps 🚀` button (Rocket icon) in `ActionToolbar.jsx`.

---

## Step 19 -- Live System Stats per PC (Feature 7) . 2026-07-29

**Added live hardware resource monitoring (CPU Usage %, RAM Used/Total GB, Disk Used/Total GB, and System Boot Uptime Hours) per PC using `psutil`, encrypted Fernet sockets, and React live progress bars.**

### Added
- `psutil` dependency added to `labcontrol-agent/requirements.txt`.
- `get_stats` command in `agent.py` returning CPU percent, RAM GB & percent, Disk GB & percent, and boot uptime hours.
- REST API endpoint `POST /api/stats` in `app.py` querying online PCs concurrently.
- `SystemStatsBar` component in `PCTable.jsx` with animated color-coded progress bars (Green `< 60%`, Amber `60-85%`, Red `> 85%`) and boot uptime badges.
- Periodic 5-second auto-fetch cycle in `LabDashboard.jsx`.

---

## Step 18 -- Scheduled Actions & Automated Timers (Feature 1) . 2026-07-29

**Added automated power scheduling (shutdown/restart/sleep) per lab or globally using APScheduler background job runner and SQLite `schedules` database table.**

### Added
- `APScheduler` dependency in `requirements.txt`.
- `schedules` table in SQLite database (`id`, `lab_id`, `command`, `scheduled_time`, `days_of_week`, `is_active`, `created_at`).
- Database helper functions: `add_schedule()`, `get_all_schedules()`, `delete_schedule()`, `toggle_schedule_active()`, `migrate_add_schedules()`.
- Background `APScheduler` cron job running every minute in `app.py` checking matching HH:MM times and day of week.
- REST API endpoints: `GET /api/schedules`, `POST /api/schedules`, `DELETE /api/schedules/<id>`, `POST /api/schedules/<id>/toggle`.
- `SchedulesModal.jsx` React component for managing active timers, day pills, active toggle switches, and command badges.
- `Schedules` button (Clock icon) in `ActionToolbar.jsx`.

---

## Step 17 -- Mobile-Responsive Dashboard (Feature 12) . 2026-07-29

**Added full mobile responsiveness across all dashboard components using Tailwind CSS breakpoints, collapsible hamburger drawer sidebar, touch-friendly min 44px tap targets, and horizontal scrollable PC table.**

### Added
- Collapsible slide-in/out hamburger menu drawer in `Sidebar.jsx` for mobile screens (`< md`) with backdrop blur overlay and `Menu` / `X` toggle buttons.
- Responsive grid stacking in `SummaryCards.jsx` (`1-column` mobile, `2-column` tablet, `3-column` desktop).
- Flex-wrapping and touch-friendly `min-h-[44px]` button targets in `ActionToolbar.jsx`.
- Horizontal scrollable container (`overflow-x-auto`) for `PCTable.jsx`.
- Mobile header with hamburger menu trigger in `LabDashboard.jsx`.

---

## Step 16 -- Dark/Light Mode Toggle (Feature 5) . 2026-07-29

**Added instant Dark/Light Mode theme toggling using React ThemeContext and Tailwind CSS class strategy - defaults to dark mode on every fresh page load.**

### Added
- `ThemeContext.jsx` for theme state management (`'dark'` / `'light'`).
- Theme toggle button in `Sidebar.jsx` with animated `Sun` and `Moon` icons from `lucide-react`.
- CSS custom variables in `index.css` supporting smooth Light Mode and Dark Mode transitions.
- Default dark mode on fresh page load (persisted via React state).

---

## Step 15 -- Two-Factor Authentication (2FA TOTP) . 2026-07-29

**Added optional Two-Factor Authentication (2FA) using TOTP - users can enable via QR code scan with an authenticator app, login flow now supports a second verification step when 2FA is enabled.**

### Added
- `pyotp`, `qrcode`, and `Pillow` dependencies in `requirements.txt`.
- `two_factor_secret` and `two_factor_enabled` columns on SQLite `users` table via `migrate_add_2fa()`.
- Database helper functions: `set_2fa_secret()`, `enable_2fa()`, `disable_2fa()`.
- REST API endpoints: `POST /api/2fa/setup`, `POST /api/2fa/confirm`, `POST /api/2fa/disable`, `POST /api/login/2fa-verify`.
- Updated `POST /api/login` to return `{requires_2fa: true}` and set `pending_2fa_user_id` when 2FA is active.
- 2-Step Login UI in `LoginPage.jsx` with 6-digit TOTP verification screen.
- `SecurityModal.jsx` for QR code display, secret key copy, TOTP confirmation, and password-protected 2FA disable.
- Security Settings button and 2FA active badge in `Sidebar.jsx`.

---

## Step 14 -- User Authentication & Session Management . 2026-07-29

**Added user login/authentication - all API routes now require login, passwords are hashed, session managed via Flask-Login.**

### Added
- `users` table in SQLite database (`id`, `username`, `password_hash`, `role`, `created_at`).
- `werkzeug.security` password hashing (`generate_password_hash` & `check_password_hash`) in `database.py`.
- User helper functions: `create_user()`, `get_user_by_username()`, `get_user_by_id()`, `verify_user_password()`.
- One-time terminal seed script `create_admin_user.py` for creating initial admin credentials.
- `Flask-Login` session management in `app.py` with `@login_required` on all management routes (`/api/labs`, `/api/pcs`, `/api/command`, `/api/wake`, `/api/logs`).
- `POST /api/login`, `POST /api/logout`, `GET /api/me` REST endpoints.
- `flask-cors` configuration with `supports_credentials=True` for session cookie handling.
- React `LoginPage.jsx` component matching dark theme palette.
- React `AuthContext.jsx` for global user session tracking and login/logout state.
- Logout button with `LogOut` icon in `Sidebar.jsx`.
- `credentials: 'include'` on all frontend `fetch()` requests and automatic 401 redirect handling.

---

## Step 13 -- Fernet Security Hardening & Lockout . 2026-07-29

**Added Fernet encryption for all agent-server communication, moved secrets to .env files, added brute-force lockout protection, removed old plain-text token system.**

### Added
- Fernet symmetric encryption (`cryptography.fernet.Fernet` AES-128-CBC + HMAC-SHA256) for all TCP socket payloads between agent and server.
- `.env` environment secret management using `python-dotenv` with `.env.example` templates and `.gitignore` integration.
- In-memory brute-force rate limiter & IP lockout mechanism in `agent.py` (5 failed attempts within 60s triggers a 5-minute IP lockout).
- `requirements.txt` dependencies: `python-dotenv` and `cryptography`.

### Removed
- Removed old plain-text token (`labcontrol-secret-2026`) system entirely.

---

## Security Update -- Token Refresh . 2026-07-29

**Updated security token from labcontrol-secret-2024 to labcontrol-secret-2026 across agent, server, and installer scripts.**

### Security
- Replaced `SECRET_TOKEN = "labcontrol-secret-2024"` with `SECRET_TOKEN = "labcontrol-secret-2026"` in `agent.py` and `command_sender.py`.
- Updated documentation references in `architecture.md` and `README.md`.

---

## Step 12 -- Wake-on-LAN (WOL) Support . 2026-07-28

**Added Wake-on-LAN (WOL) magic packet UDP broadcast support to turn on powered-off PCs remotely, added `POST /api/wake` REST endpoint, MAC address editing in PC modals, MAC address column in PCTable, vibrant "Wake Selected" action button, and WOL setup guide modal.**

### Added
- `send_wol_packet(mac_address)` native UDP broadcast implementation in `command_sender.py` (Port 9 magic packet).
- `POST /api/wake` API endpoint in `app.py` logging `wake` command history in SQLite DB.
- `mac_address` input fields in `AddPCModal.jsx` and `EditPCModal.jsx`.
- MAC Address column in `PCTable.jsx`.
- Vibrant green **"Wake Selected"** button with `Zap` icon in `ActionToolbar.jsx`.
- `WOLHelpModal.jsx` setup guide for BIOS/UEFI and Windows Network Adapter configuration.
- `docs/protocol.md` documenting TCP vs UDP WOL Magic Packet protocols.
- `wakeonlan` dependency to `requirements.txt`.

### Changed
- `update_pc()` in `database.py` now accepts and updates `mac_address`.
- `api_add_pc` and `api_update_pc` in `app.py` now process `mac_address`.

---

## Step 7 -- Multi-Lab System + React Frontend . 2026-07-28

**Added multi-lab support (labs table, lab_id on pcs), converted Flask app into pure REST API with CORS, built new React (Vite + Tailwind) frontend with sidebar lab navigation, per-lab dashboards, and modals for adding labs/PCs and confirming actions.**

### Added
- `labs` table in SQLite database (name, location, created_at)
- `lab_id` column on `pcs` table (FK to labs)
- Lab management functions: add_lab, get_all_labs, get_pcs_by_lab, delete_lab
- Migration function migrate_add_labs() with default 'Unassigned Lab'
- Flask REST API endpoints: GET/POST /api/labs, DELETE /api/labs/<id>
- CORS support via flask-cors
- React frontend (Vite + Tailwind CSS + lucide-react)
- Sidebar with lab navigation and PC counts
- Per-lab PC dashboards with filtered status and logs
- Modals for adding labs, adding PCs, and confirming destructive actions
- Auto-refresh every 5 seconds

### Changed
- app.py converted from template-rendering to pure REST API
- get_all_pcs() now includes lab_id and lab_name
- get_logs() now accepts optional lab_id filter
- add_pc() now accepts optional lab_id parameter

---

## Step 6 -- Flask Web Dashboard . 2026-07-28

**Built Flask web dashboard with live PC status table, command buttons, confirmation modals, recent activity log view, add-PC form, auto-refresh every 5 seconds.**

### Added
- `labcontrol-dashboard/app.py` -- Flask web app with REST API endpoints.
- `labcontrol-dashboard/templates/dashboard.html` -- Dark-mode dashboard with PC table, action buttons, confirmation modals, activity log, and add-PC form.
- `labcontrol-dashboard/static/style.css` -- Modern dark theme with CSS variables, status badges, toast notifications.
- `labcontrol-dashboard/requirements.txt` -- Flask dependency.
