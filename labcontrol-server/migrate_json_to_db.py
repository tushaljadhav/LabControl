"""
LabControl — Migrate pc_list.json to SQLite Database
=====================================================
This is a ONE-TIME migration script. Run it once to move your existing PC list
from the old pc_list.json file into the new SQLite database (labcontrol.db).

What it does:
  1. Reads all PCs from pc_list.json
  2. Inserts each one into the `pcs` table in the database
  3. Prints a summary of how many PCs were migrated

After running this, the server will use the database instead of the JSON file.
You can keep pc_list.json as a backup — the server won't read it anymore.

Usage:
  python migrate_json_to_db.py

Prerequisites:
  - pc_list.json must exist in this folder
  - database.py must be in this folder (it creates the database automatically)
"""

import json
import os
import sys

# Import our database module — this also creates the database if it doesn't exist
from database import add_pc

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

# Path to the old JSON file (same folder as this script)
PC_LIST_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pc_list.json")


def migrate():
    """
    Read pc_list.json and insert each PC into the database.
    """
    # ── Step 1: Read the JSON file ───────────────────────────────────────
    print(f"\n  Reading from: {PC_LIST_FILE}")
    
    try:
        with open(PC_LIST_FILE, "r") as f:
            pc_list = json.load(f)
    except FileNotFoundError:
        print(f"  [ERROR] File not found: {PC_LIST_FILE}")
        print(f"  Make sure pc_list.json exists in the same folder as this script.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"  [ERROR] Invalid JSON: {e}")
        sys.exit(1)
    
    print(f"  Found {len(pc_list)} PC(s) in pc_list.json\n")
    
    # ── Step 2: Insert each PC into the database ─────────────────────────
    migrated = 0
    skipped = 0
    
    for pc in pc_list:
        name = pc.get("name", "Unknown")
        ip = pc.get("ip", "")
        
        if not ip:
            print(f"  [SKIP] PC '{name}' has no IP address. Skipping.")
            skipped += 1
            continue
        
        # add_pc() returns None if the IP already exists (duplicate)
        result = add_pc(name, ip)
        
        if result is not None:
            migrated += 1
        else:
            skipped += 1
    
    # ── Step 3: Print summary ────────────────────────────────────────────
    print(f"\n  {'=' * 40}")
    print(f"  Migration complete!")
    print(f"  {'=' * 40}")
    print(f"  Migrated: {migrated} PC(s)")
    if skipped > 0:
        print(f"  Skipped:  {skipped} (duplicates or missing IP)")
    print(f"\n  The server will now use labcontrol.db instead of pc_list.json.")
    print(f"  You can keep pc_list.json as a backup.\n")


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    migrate()
