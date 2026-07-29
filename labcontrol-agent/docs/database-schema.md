# LabControl -- Database Schema

> **IMPLEMENTED** in Step 5. The SQLite database (`labcontrol.db`) is now live and used by the server. The module `database.py` handles all database operations.

---

## Overview

The LabControl Server uses a local **SQLite** database to store:

1. **PC inventory** -- which PCs are registered, their network details, and current status.
2. **Command logs** -- a history of every command sent to every PC, for auditing and troubleshooting.

SQLite is chosen because it requires no separate database server -- it's just a single `.db` file, and Python has built-in support via the `sqlite3` module.

**Database file:** `labcontrol-server/labcontrol.db` (created automatically on first run)
**Database module:** `labcontrol-server/database.py` (all DB functions live here)

---

## Tables

### `labs` -- Lab Locations

Stores the physical labs where PCs are located.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier for the lab. |
| `name` | TEXT | NOT NULL | A human-friendly label (e.g. `Main Lab`). |
| `location` | TEXT | nullable | The physical location/building of the lab. |
| `created_at` | TEXT | | Timestamp when the lab was created. |

```sql
CREATE TABLE IF NOT EXISTS labs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    location    TEXT,
    created_at  TEXT
);
```

---

### `schedules` -- Automated Timers & Scheduled Actions (Feature 1)

Stores automated power schedules (shutdown/restart/sleep) to run automatically at specific times on specified days.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier for the schedule. |
| `lab_id` | INTEGER | FOREIGN KEY -> `labs.id`, nullable | Target lab (NULL = All Labs). |
| `command` | TEXT | NOT NULL | Action to perform (`shutdown`, `restart`, `sleep`). |
| `scheduled_time` | TEXT | NOT NULL | Time to trigger in 24-hour format (`HH:MM`, e.g. `18:30`). |
| `days_of_week` | TEXT | NOT NULL | Days to repeat (`Mon,Tue,Wed,Thu,Fri`). |
| `is_active` | INTEGER | DEFAULT 1 | Whether schedule is active (`1`) or disabled (`0`). |
| `created_at` | TEXT | NOT NULL | Timestamp when schedule was created. |

```sql
CREATE TABLE IF NOT EXISTS schedules (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    lab_id         INTEGER NULL,
    command        TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    days_of_week   TEXT NOT NULL,
    is_active      INTEGER DEFAULT 1,
    created_at     TEXT NOT NULL,
    FOREIGN KEY (lab_id) REFERENCES labs (id) ON DELETE CASCADE
);
```

---

### `pcs` -- Registered Lab PCs

Stores one row per lab PC that the admin has registered.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier for the PC. |
| `lab_id` | INTEGER | FOREIGN KEY -> `labs.id`, nullable | Which lab this PC belongs to. |
| `name` | TEXT | NOT NULL | A human-friendly label (e.g. `Lab-PC-01`). |
| `ip_address` | TEXT | NOT NULL | The PC's current LAN IP address (e.g. `192.168.1.42`). |
| `mac_address` | TEXT | nullable | The PC's MAC address (for future Wake-on-LAN support). |
| `status` | TEXT | DEFAULT `'unknown'` | Current status: `online`, `offline`, or `unknown`. |
| `last_seen` | TEXT | nullable | Timestamp of the last successful communication (YYYY-MM-DD HH:MM:SS). |

```sql
CREATE TABLE IF NOT EXISTS pcs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    lab_id      INTEGER,
    name        TEXT    NOT NULL,
    ip_address  TEXT    NOT NULL,
    mac_address TEXT,
    status      TEXT    DEFAULT 'unknown',
    last_seen   TEXT,
    FOREIGN KEY (lab_id) REFERENCES labs (id)
);
```

---

### `logs` -- Command History

Stores one row for every command sent to any PC.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique log entry ID. |
| `pc_id` | INTEGER | FOREIGN KEY -> `pcs.id`, NOT NULL | Which PC received the command. |
| `command` | TEXT | NOT NULL | The command that was sent (e.g. `shutdown`, `restart`). |
| `status` | TEXT | NOT NULL | The result: `success`, `offline`, `unauthorized`, or `error`. |
| `timestamp` | TEXT | NOT NULL | When the command was sent (YYYY-MM-DD HH:MM:SS). |

```sql
CREATE TABLE IF NOT EXISTS logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    pc_id     INTEGER NOT NULL,
    command   TEXT    NOT NULL,
    status    TEXT    NOT NULL,
    timestamp TEXT    NOT NULL,
    FOREIGN KEY (pc_id) REFERENCES pcs (id)
);
```

---

## Why Foreign Keys?

The `pc_id` column in the `logs` table is a **foreign key** -- it references `pcs.id`. This means:

- Every log entry MUST belong to a real PC in the `pcs` table.
- You can't have "orphan" logs pointing to PCs that don't exist.
- When querying logs, you can JOIN with `pcs` to get the PC name alongside each log entry.
- It enforces data integrity at the database level, not just in our Python code.

---

## Entity Relationship

```
 +---------------+         +---------------+         +---------------+
 |     labs      |         |     pcs       |         |     logs      |
 +---------------+         +---------------+         +---------------+
 | id (PK)       |<--------| lab_id (FK)   |         |               |
 | name          |    1:N  | id (PK)       |<--------| pc_id (FK)    |
 | location      |         | name          |    1:N  | id (PK)       |
 | created_at    |         | ip_address    |         | command       |
 +---------------+         | mac_address   |         | status        |
                           | status        |         | timestamp     |
                           | last_seen     |         +---------------+
                           +---------------+
```

One Lab can have many PCs (1:N relationship). One PC can have many log entries (1:N relationship).

---

## Available Database Functions (`database.py`)

| Function | Description |
|----------|-------------|
| `add_lab(name, location=None)` | Insert a new lab |
| `get_all_labs()` | Return all labs as a list of dictionaries |
| `delete_lab(lab_id)` | Delete a lab and remove its PCs |
| `add_pc(name, ip, mac=None, lab_id=None)` | Insert a new PC (skips if IP already exists) |
| `get_all_pcs()` | Return all PCs as a list of dictionaries, including lab info |
| `get_pcs_by_lab(lab_id)` | Return all PCs belonging to a specific lab |
| `update_pc_status(pc_id, status)` | Update a PC's status and last_seen timestamp |
| `add_log(pc_id, command, status)` | Record a command that was sent to a PC |
| `get_logs(limit=50, lab_id=None)` | Get recent logs, newest first, optionally filtered by lab |

---

## Migration from pc_list.json

PCs were originally stored in `pc_list.json`. The one-time script `migrate_json_to_db.py` reads the JSON file and inserts each PC into the database. After migration, the server reads from the database only. The JSON file is kept as a backup.

---

## Future Considerations

- **Groups table** -- to organize PCs into lab rooms or groups (e.g. "Lab A", "Lab B").
- **Users table** -- to track which admin sent each command.
- **Indexes** -- add indexes on `logs.pc_id` and `logs.timestamp` for faster queries once the table grows.
- **Migration strategy** -- use a simple version number or migration scripts when the schema changes.
