"""
LabControl Database Module
==========================
This module handles all database operations for LabControl using SQLite.

SQLite is a lightweight database that stores everything in a single file (labcontrol.db).
Python has built-in support for it via the `sqlite3` module — no installation needed.

This module provides functions to:
  - Create the database and tables (if they don't exist yet)
  - Add, retrieve, and update PCs in the `pcs` table
  - Log every command sent to every PC in the `logs` table

Why use a database instead of pc_list.json?
  - We can store more info per PC (status, last seen, MAC address)
  - We can keep a history of every command ever sent (the logs table)
  - We can query and filter data easily (e.g. "show me all offline PCs")
  - It's more reliable than reading/writing JSON files repeatedly
"""

import sqlite3   # Python's built-in SQLite module
import os        # For file path handling
from datetime import datetime  # For timestamps
from werkzeug.security import generate_password_hash, check_password_hash

# ──────────────────────────────────────────────────────────────────────────────
# Database file path — stored in the same folder as this script
# ──────────────────────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "labcontrol.db")


def get_connection():
    """
    Open a connection to the SQLite database and return it.
    
    What is a "connection"?
    ───────────────────────
    Think of it like opening a file. Before you can read or write data,
    you need to "connect" to the database. When you're done, you close it.
    
    `sqlite3.connect()` will CREATE the database file if it doesn't exist yet.
    
    `row_factory = sqlite3.Row` makes query results behave like dictionaries,
    so you can access columns by name (e.g. row["name"]) instead of by index
    (e.g. row[0]). This makes the code much more readable.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dict-like objects
    conn.execute("PRAGMA foreign_keys = ON")  # Enforce foreign key relationships
    return conn


def initialize_database():
    """
    Create the database tables if they don't already exist.
    
    This is safe to call every time the server starts — `CREATE TABLE IF NOT EXISTS`
    will do nothing if the tables are already there.
    
    We create two tables:
    
    1. `pcs` — stores info about each lab PC
       - id:          unique auto-generated number for each PC
       - name:        human-friendly label (e.g. "Lab-PC-01")
       - ip_address:  the PC's LAN IP (e.g. "192.168.1.42")
       - mac_address: for future Wake-on-LAN support (optional for now)
       - status:      current state — "online", "offline", or "unknown"
       - last_seen:   timestamp of last successful communication
    
    2. `logs` — records every command ever sent to any PC
       - id:        unique auto-generated log entry number
       - pc_id:     which PC this log is about (links to pcs.id)
       - command:   what command was sent (e.g. "shutdown", "restart")
       - status:    the result (e.g. "success", "offline", "error")
       - timestamp: when the command was sent
    
    The `pc_id` in `logs` is a FOREIGN KEY — it means every log entry MUST
    reference a valid PC. This prevents "orphan" logs that point to PCs
    that don't exist. It also lets us JOIN the two tables to see the PC name
    alongside each log entry.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # ── Create the pcs table ─────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS pcs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            ip_address  TEXT    NOT NULL,
            mac_address TEXT,
            status      TEXT    DEFAULT 'unknown',
            last_seen   TEXT
        )
    """)
    
    # ── Create the logs table ────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            pc_id     INTEGER NOT NULL,
            command   TEXT    NOT NULL,
            status    TEXT    NOT NULL,
            timestamp TEXT    NOT NULL,
            FOREIGN KEY (pc_id) REFERENCES pcs (id)
        )
    """)
    
    conn.commit()  # Save the changes
    conn.close()   # Close the connection
    print(f"[DB] Database initialized at: {DB_PATH}")


def migrate_add_labs():
    """
    Migrate database to support multiple labs.
    Creates the labs table, adds lab_id to pcs, and assigns unassigned PCs to a default lab.
    Safe to run multiple times.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Create labs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS labs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            created_at TEXT
        )
    """)
    
    # Add lab_id to pcs table if not exists
    try:
        cursor.execute("ALTER TABLE pcs ADD COLUMN lab_id INTEGER REFERENCES labs(id)")
    except sqlite3.OperationalError as e:
        # Ignore error if column already exists
        if "duplicate column name" not in str(e).lower():
            raise
            
    # Create default lab if it doesn't exist
    cursor.execute("SELECT id FROM labs WHERE name = 'Unassigned Lab'")
    if not cursor.fetchone():
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("INSERT INTO labs (name, created_at) VALUES ('Unassigned Lab', ?)", (now,))
        
    # Assign unassigned PCs to default lab
    cursor.execute("SELECT id FROM labs WHERE name = 'Unassigned Lab'")
    default_lab_id = cursor.fetchone()["id"]
    cursor.execute("UPDATE pcs SET lab_id = ? WHERE lab_id IS NULL", (default_lab_id,))
    
    conn.commit()
    conn.close()
    print("[DB] Lab migrations completed successfully.")


# ──────────────────────────────────────────────────────────────────────────────
# Lab Management Functions
# ──────────────────────────────────────────────────────────────────────────────

def add_lab(name, location=None):
    """
    Add a new lab to the database.
    
    Parameters:
        name     : Name of the lab (e.g. "Lab A")
        location : Optional location description
        
    Returns:
        The ID of the newly inserted lab.
    """
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        "INSERT INTO labs (name, location, created_at) VALUES (?, ?, ?)",
        (name, location, now)
    )
    lab_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return lab_id


def get_all_labs():
    """
    Get all labs along with their PC count.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT labs.*, COUNT(pcs.id) as pc_count 
        FROM labs 
        LEFT JOIN pcs ON labs.id = pcs.lab_id 
        GROUP BY labs.id
        ORDER BY labs.name
    """)
    rows = cursor.fetchall()
    labs = [dict(row) for row in rows]
    conn.close()
    return labs


def get_pcs_by_lab(lab_id):
    """
    Get all PCs assigned to a specific lab.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT pcs.*, labs.name as lab_name
        FROM pcs
        LEFT JOIN labs ON pcs.lab_id = labs.id
        WHERE pcs.lab_id = ?
        ORDER BY pcs.name
    """, (lab_id,))
    rows = cursor.fetchall()
    
    pc_list = []
    for row in rows:
        pc_list.append({
            "id": row["id"],
            "name": row["name"],
            "ip": row["ip_address"],
            "mac_address": row["mac_address"],
            "status": row["status"],
            "last_seen": row["last_seen"],
            "lab_id": row["lab_id"],
            "lab_name": row["lab_name"],
        })
    conn.close()
    return pc_list


def delete_lab(lab_id):
    """
    Delete a lab only if no PCs are assigned to it.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as pc_count FROM pcs WHERE lab_id = ?", (lab_id,))
    count = cursor.fetchone()["pc_count"]

    if count > 0:
        conn.close()
        return {"status": "error", "message": f"Cannot delete lab with {count} assigned PCs. Move or delete them first."}

    cursor.execute("DELETE FROM labs WHERE id = ?", (lab_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}


def update_lab(lab_id, name=None, location=None):
    """
    Update lab name and/or location.
    """
    conn = get_connection()
    cursor = conn.cursor()
    if name is not None and name.strip():
        cursor.execute("UPDATE labs SET name = ? WHERE id = ?", (name.strip(), lab_id))
    if location is not None:
        cursor.execute("UPDATE labs SET location = ? WHERE id = ?", (location.strip() or None, lab_id))
    conn.commit()
    conn.close()
    return {"status": "success"}


def update_pc(pc_id, name=None, ip_address=None, mac_address=None, lab_id=None):
    """
    Update PC details (name, ip_address, mac_address, lab_id).
    """
    conn = get_connection()
    cursor = conn.cursor()

    if name is not None and name.strip():
        cursor.execute("UPDATE pcs SET name = ? WHERE id = ?", (name.strip(), pc_id))
    if ip_address is not None and ip_address.strip():
        cursor.execute("UPDATE pcs SET ip_address = ? WHERE id = ?", (ip_address.strip(), pc_id))
    if mac_address is not None:
        cursor.execute("UPDATE pcs SET mac_address = ? WHERE id = ?", (mac_address.strip() or None, pc_id))
    if lab_id is not None:
        cursor.execute("UPDATE pcs SET lab_id = ? WHERE id = ?", (lab_id, pc_id))

    conn.commit()
    conn.close()
    return {"status": "success"}


def delete_pc(pc_id):
    """
    Delete a PC and its logs from the database.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM logs WHERE pc_id = ?", (pc_id,))
    cursor.execute("DELETE FROM pcs WHERE id = ?", (pc_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}



# ──────────────────────────────────────────────────────────────────────────────
# PC Management Functions
# ──────────────────────────────────────────────────────────────────────────────

def add_pc(name, ip_address, mac_address=None, lab_id=None):
    """
    Add a new PC to the database.
    
    Parameters:
        name        : Human-friendly label (e.g. "Lab-PC-01")
        ip_address  : LAN IP address (e.g. "192.168.1.42")
        mac_address : MAC address for Wake-on-LAN (optional, can be None)
        lab_id      : ID of the lab this PC belongs to (optional, can be None)
    
    Returns:
        The ID of the newly inserted PC, or None if the IP already exists.
    
    Why check for duplicate IPs?
    ────────────────────────────
    Each PC should have a unique IP on the network. If we accidentally add
    the same IP twice, the server would send commands to the same PC twice.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if a PC with this IP already exists
    cursor.execute("SELECT id FROM pcs WHERE ip_address = ?", (ip_address,))
    existing = cursor.fetchone()
    
    if existing:
        print(f"[DB] PC with IP {ip_address} already exists (id={existing['id']}). Skipping.")
        conn.close()
        return None
    
    # Insert the new PC
    cursor.execute(
        "INSERT INTO pcs (name, ip_address, mac_address, lab_id) VALUES (?, ?, ?, ?)",
        (name, ip_address, mac_address, lab_id)
    )
    
    pc_id = cursor.lastrowid  # Get the auto-generated ID of the new row
    conn.commit()
    conn.close()
    
    print(f"[DB] Added PC: {name} ({ip_address}) -> id={pc_id}")
    return pc_id


def get_all_pcs():
    """
    Get all PCs from the database as a list of dictionaries.
    
    Returns:
        A list like:
        [
            {"id": 1, "name": "Lab-PC-01", "ip": "192.168.1.10", "mac_address": None, 
             "status": "unknown", "last_seen": None},
            {"id": 2, "name": "Lab-PC-02", "ip": "192.168.1.11", ...},
        ]
    
    Note: We rename "ip_address" to "ip" in the output so it matches the format
    that send_command() expects (pc["ip"]).
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT pcs.*, labs.name as lab_name 
        FROM pcs 
        LEFT JOIN labs ON pcs.lab_id = labs.id 
        ORDER BY pcs.name
    """)
    rows = cursor.fetchall()
    
    # Convert sqlite3.Row objects to regular dictionaries
    # and rename ip_address -> ip for compatibility with send_command()
    pc_list = []
    for row in rows:
        pc_list.append({
            "id": row["id"],
            "name": row["name"],
            "ip": row["ip_address"],
            "mac_address": row["mac_address"],
            "status": row["status"],
            "last_seen": row["last_seen"],
            "lab_id": row["lab_id"],
            "lab_name": row["lab_name"],
        })
    
    conn.close()
    return pc_list


def update_pc_status(pc_id, status):
    """
    Update a PC's status and set last_seen to the current time.
    
    Parameters:
        pc_id  : The database ID of the PC to update
        status : New status string (e.g. "online", "offline", "error", "unauthorized")
    """
    # Normalize "success" status from command_sender to "online" for UI badges
    if status == "success":
        status = "online"

    conn = get_connection()
    cursor = conn.cursor()
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute(
        "UPDATE pcs SET status = ?, last_seen = ? WHERE id = ?",
        (status, now, pc_id)
    )
    
    conn.commit()
    conn.close()


# ──────────────────────────────────────────────────────────────────────────────
# Logging Functions
# ──────────────────────────────────────────────────────────────────────────────

def add_log(pc_id, command, status):
    """
    Record a command that was sent to a PC.
    
    Parameters:
        pc_id   : The database ID of the target PC
        command : What command was sent (e.g. "shutdown", "restart")
        status  : The result (e.g. "success", "offline", "error")
    
    This creates a permanent record of every action. Useful for:
      - Auditing: "Who shut down Lab-PC-03 yesterday?"
      - Debugging: "Why is Lab-PC-05 offline? Was it shut down?"
      - Tracking: "How many times did we restart Lab B this week?"
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute(
        "INSERT INTO logs (pc_id, command, status, timestamp) VALUES (?, ?, ?, ?)",
        (pc_id, command, status, now)
    )
    
    conn.commit()
    conn.close()


def get_logs(limit=50, lab_id=None):
    """
    Get the most recent log entries, newest first. Optionally filter by lab.
    
    Parameters:
        limit : How many entries to return (default: 50)
        lab_id : Optional ID of the lab to filter logs by
    
    Returns:
        A list of dictionaries like:
        [
            {"id": 42, "pc_name": "Lab-PC-01", "command": "shutdown", 
             "status": "success", "timestamp": "2026-07-27 20:15:30"},
            ...
        ]
    
    We use a JOIN here — this is a SQL concept that combines data from two tables.
    Instead of just getting pc_id (a number), we JOIN with the pcs table to get
    the actual PC name. This makes the output human-readable.
    
    The SQL query reads like:
    "Get logs, but for each log, also look up the PC name from the pcs table
     where pcs.id matches logs.pc_id. Sort by newest first. Limit to N rows."
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    if lab_id is not None:
        cursor.execute("""
            SELECT 
                logs.id,
                pcs.name AS pc_name,
                logs.command,
                logs.status,
                logs.timestamp
            FROM logs
            JOIN pcs ON pcs.id = logs.pc_id
            WHERE pcs.lab_id = ?
            ORDER BY logs.timestamp DESC, logs.id DESC
            LIMIT ?
        """, (lab_id, limit))
    else:
        cursor.execute("""
            SELECT 
                logs.id,
                pcs.name AS pc_name,
                logs.command,
                logs.status,
                logs.timestamp
            FROM logs
            JOIN pcs ON pcs.id = logs.pc_id
            ORDER BY logs.timestamp DESC, logs.id DESC
            LIMIT ?
        """, (limit,))
    
    rows = cursor.fetchall()
    
    # Convert to regular dictionaries
    log_list = []
    for row in rows:
        log_list.append({
            "id": row["id"],
            "pc_name": row["pc_name"],
            "command": row["command"],
            "status": row["status"],
            "timestamp": row["timestamp"],
        })
    
    conn.close()
    return log_list


def migrate_add_users():
    """
    Create the users table if it does not exist yet.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at TEXT
        )
    """)
    conn.commit()
    conn.close()


def migrate_add_2fa():
    """
    Add two_factor_secret and two_factor_enabled columns to users table.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN two_factor_secret TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists

    conn.commit()
    conn.close()


def set_2fa_secret(user_id, secret):
    """
    Store generated TOTP secret for a user.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET two_factor_secret = ? WHERE id = ?", (secret, int(user_id)))
    conn.commit()
    conn.close()


def enable_2fa(user_id):
    """
    Enable two-factor authentication for a user.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET two_factor_enabled = 1 WHERE id = ?", (int(user_id),))
    conn.commit()
    conn.close()


def disable_2fa(user_id):
    """
    Disable two-factor authentication for a user and clear the secret.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?", (int(user_id),))
    conn.commit()
    conn.close()


def create_user(username, password, role="admin"):
    """
    Create a new user with a hashed password using werkzeug.security.
    """
    if not username or not str(username).strip() or not password:
        return {"status": "error", "message": "Username and password are required"}

    pwd_hash = generate_password_hash(password)
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, created_at)
            VALUES (?, ?, ?, ?)
        """, (str(username).strip(), pwd_hash, role, created_at))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return {"status": "success", "id": user_id, "username": str(username).strip(), "role": role}
    except sqlite3.IntegrityError:
        conn.close()
        return {"status": "error", "message": f"Username '{str(username).strip()}' already exists"}


def get_user_by_username(username):
    """
    Retrieve a user dict by username including 2FA fields.
    """
    if not username:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (str(username).strip(),))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    keys = row.keys()
    return {
        "id": row["id"],
        "username": row["username"],
        "password_hash": row["password_hash"],
        "role": row["role"],
        "created_at": row["created_at"],
        "two_factor_secret": row["two_factor_secret"] if "two_factor_secret" in keys else None,
        "two_factor_enabled": bool(row["two_factor_enabled"]) if "two_factor_enabled" in keys and row["two_factor_enabled"] else False,
    }


def get_user_by_id(user_id):
    """
    Retrieve a user dict by user_id including 2FA fields.
    """
    if not user_id:
        return None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (int(user_id),))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    keys = row.keys()
    return {
        "id": row["id"],
        "username": row["username"],
        "password_hash": row["password_hash"],
        "role": row["role"],
        "created_at": row["created_at"],
        "two_factor_secret": row["two_factor_secret"] if "two_factor_secret" in keys else None,
        "two_factor_enabled": bool(row["two_factor_enabled"]) if "two_factor_enabled" in keys and row["two_factor_enabled"] else False,
    }


def verify_user_password(username, password):
    """
    Verify username and password against database.
    Returns user dict if valid, None if invalid.
    """
    user = get_user_by_username(username)
    if not user:
        return None
    if check_password_hash(user["password_hash"], password):
        return user
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Scheduled Actions Table & Functions (Feature 1)
# ──────────────────────────────────────────────────────────────────────────────

def migrate_add_schedules():
    """
    Creates the `schedules` table if it does not exist.
    Columns:
      - id: INTEGER PRIMARY KEY AUTOINCREMENT
      - lab_id: INTEGER (nullable, NULL means 'All Labs')
      - command: TEXT (shutdown / restart / sleep)
      - scheduled_time: TEXT (HH:MM format, 24-hour e.g. '18:30')
      - days_of_week: TEXT (comma-separated e.g. 'Mon,Tue,Wed,Thu,Fri')
      - is_active: BOOLEAN (default 1 / true)
      - created_at: TEXT
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lab_id INTEGER NULL,
            command TEXT NOT NULL,
            scheduled_time TEXT NOT NULL,
            days_of_week TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            FOREIGN KEY (lab_id) REFERENCES labs (id) ON DELETE CASCADE
        )
    """)
    conn.commit()
    conn.close()


def add_schedule(lab_id, command, scheduled_time, days_of_week):
    """
    Add a new scheduled action to database.
    lab_id: integer or None
    command: 'shutdown', 'restart', 'sleep'
    scheduled_time: 'HH:MM' string
    days_of_week: 'Mon,Tue,Wed,Thu,Fri'
    """
    conn = get_connection()
    cursor = conn.cursor()
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Format lab_id as int or None
    target_lab_id = int(lab_id) if lab_id is not None and str(lab_id).isdigit() else None

    cursor.execute("""
        INSERT INTO schedules (lab_id, command, scheduled_time, days_of_week, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
    """, (target_lab_id, command.lower(), scheduled_time.strip(), days_of_week.strip(), created_at))
    conn.commit()
    schedule_id = cursor.lastrowid
    conn.close()
    return schedule_id


def get_all_schedules():
    """
    Retrieve all scheduled actions joined with lab names.
    Returns list of dicts.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT schedules.*, labs.name as lab_name
        FROM schedules
        LEFT JOIN labs ON schedules.lab_id = labs.id
        ORDER BY schedules.scheduled_time ASC, schedules.id DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "lab_id": r["lab_id"],
            "lab_name": r["lab_name"] if r["lab_id"] and r["lab_name"] else "All Labs",
            "command": r["command"],
            "scheduled_time": r["scheduled_time"],
            "days_of_week": r["days_of_week"],
            "is_active": bool(r["is_active"]),
            "created_at": r["created_at"]
        })
    return result


def delete_schedule(schedule_id):
    """
    Delete a schedule by id.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM schedules WHERE id = ?", (int(schedule_id),))
    conn.commit()
    conn.close()
    return True


def toggle_schedule_active(schedule_id):
    """
    Toggle is_active between 1 (true) and 0 (false) for a schedule.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_active FROM schedules WHERE id = ?", (int(schedule_id),))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False

    new_state = 0 if row["is_active"] else 1
    cursor.execute("UPDATE schedules SET is_active = ? WHERE id = ?", (new_state, int(schedule_id)))
    conn.commit()
    conn.close()
    return bool(new_state)


# ──────────────────────────────────────────────────────────────────────────────
# Auto-Discovery: Find PC by MAC Address
# ──────────────────────────────────────────────────────────────────────────────

def get_pc_by_mac(mac_address):
    """
    Find a PC in the database by its MAC address.
    
    Used by the Auto-Discovery heartbeat endpoint to check if an agent's PC
    already exists in the database (so we can update its IP if it changed)
    or if it's a brand-new PC that needs to be auto-registered.
    
    MAC comparison is case-insensitive and ignores separators (: - .)
    so "C4:75:AB:3D:37:9F" matches "c4-75-ab-3d-37-9f".
    
    Parameters:
        mac_address : The MAC address string to search for
        
    Returns:
        A PC dictionary if found, or None if no PC has this MAC.
    """
    if not mac_address:
        return None
    
    # Normalize: remove separators and lowercase for comparison
    clean_mac = mac_address.replace(":", "").replace("-", "").replace(".", "").strip().lower()
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Get all PCs that have a MAC address set
    cursor.execute("""
        SELECT pcs.*, labs.name as lab_name
        FROM pcs
        LEFT JOIN labs ON pcs.lab_id = labs.id
        WHERE pcs.mac_address IS NOT NULL AND pcs.mac_address != ''
    """)
    rows = cursor.fetchall()
    conn.close()
    
    for row in rows:
        db_mac = row["mac_address"].replace(":", "").replace("-", "").replace(".", "").strip().lower()
        if db_mac == clean_mac:
            return {
                "id": row["id"],
                "name": row["name"],
                "ip": row["ip_address"],
                "mac_address": row["mac_address"],
                "status": row["status"],
                "last_seen": row["last_seen"],
                "lab_id": row["lab_id"],
                "lab_name": row["lab_name"],
            }
    
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Auto-initialize when this module is imported
# ──────────────────────────────────────────────────────────────────────────────
initialize_database()
migrate_add_labs()
migrate_add_users()
migrate_add_2fa()
migrate_add_schedules()



