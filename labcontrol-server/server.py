"""
LabControl Server (CLI)
=======================
Console-based admin interface for LabControl. Reads PCs from the SQLite database,
sends power commands in parallel, logs results, and displays a menu.

This is the original CLI interface. The Flask web dashboard (labcontrol-dashboard)
provides a browser-based alternative. Both use the same database and command logic.

Usage:
  python server.py
"""

import sys
from database import get_all_pcs, update_pc_status, add_log, get_logs
from command_sender import send_to_pcs


def send_to_all(pc_list, command):
    """
    Send a command to ALL PCs in parallel, update the database, and print results.
    """
    print(f"\n  Sending '{command.upper()}' to {len(pc_list)} PC(s)...\n")

    # Use the shared send logic (from command_sender.py)
    results = send_to_pcs(pc_list, command)

    # Update database with results
    for r in results:
        if r["status"] == "success":
            db_status = "online"
        elif r["status"] == "offline":
            db_status = "offline"
        else:
            db_status = r["status"]

        update_pc_status(r["id"], db_status)
        add_log(r["id"], command, r["status"])

    # Print results table
    print(f"  Command: {command.upper()}")
    print(f"  {'-' * 55}")

    for r in results:
        status_display = r["status"].upper()
        detail = ""
        if "detail" in r:
            detail = f"  ({r['detail']})"
        print(f"  {r['name']:<15} {r['ip']:<18} {status_display}{detail}")

    print(f"  {'-' * 55}")

    total = len(results)
    success_count = sum(1 for r in results if r["status"] == "success")
    offline_count = sum(1 for r in results if r["status"] == "offline")
    unauth_count  = sum(1 for r in results if r["status"] == "unauthorized")
    error_count   = sum(1 for r in results if r["status"] == "error")

    print(f"  Total: {total} | Success: {success_count} | Offline: {offline_count}", end="")
    if unauth_count > 0:
        print(f" | Unauthorized: {unauth_count}", end="")
    if error_count > 0:
        print(f" | Error: {error_count}", end="")
    print("\n")


def view_recent_logs():
    """Fetch and display the last 20 log entries."""
    logs = get_logs(limit=20)

    if not logs:
        print("\n  No log entries yet. Send a command first!\n")
        return

    print(f"\n  Recent Command Log (last {len(logs)} entries)")
    print(f"  {'-' * 65}")
    print(f"  {'PC Name':<15} {'Command':<12} {'Status':<15} {'Timestamp'}")
    print(f"  {'-' * 65}")

    for log in logs:
        print(f"  {log['pc_name']:<15} {log['command']:<12} {log['status']:<15} {log['timestamp']}")

    print(f"  {'-' * 65}\n")


def show_menu():
    """Display the command-line menu and return the user's choice."""
    print("=" * 45)
    print("  LabControl Server - Choose an action:")
    print("=" * 45)
    print("  1. Shutdown All")
    print("  2. Restart All")
    print("  3. Sleep All")
    print("  4. Cancel All  (safe - cancels pending shutdowns)")
    print("  5. View Recent Logs")
    print("  6. Exit")
    print("=" * 45)

    choice = input("  Enter choice (1-6): ").strip()
    return choice


def main():
    """Main entry point: load PC list from database, show menu, send commands, repeat."""
    pc_list = get_all_pcs()

    if not pc_list:
        print("\n  [ERROR] No PCs found in the database!")
        print("  Run 'python migrate_json_to_db.py' first to import your PC list.\n")
        sys.exit(1)

    print("\n" + "=" * 45)
    print("  LabControl Server (CLI)")
    print("=" * 45)
    print(f"  Loaded {len(pc_list)} PC(s) from database:")
    for pc in pc_list:
        status_tag = f" [{pc['status']}]" if pc['status'] != 'unknown' else ""
        print(f"    - {pc['name']}  ({pc['ip']}){status_tag}")
    print()

    menu_commands = {
        "1": "shutdown",
        "2": "restart",
        "3": "sleep",
        "4": "cancel",
    }

    while True:
        choice = show_menu()

        if choice == "6":
            print("\n  Goodbye!\n")
            break

        if choice == "5":
            view_recent_logs()
            continue

        if choice in menu_commands:
            command = menu_commands[choice]
            pc_list = get_all_pcs()

            if command in ("shutdown", "restart"):
                confirm = input(f"\n  WARNING: This will {command.upper()} all {len(pc_list)} PC(s). "
                                f"Are you sure? (y/n): ").strip().lower()
                if confirm != "y":
                    print("  Cancelled.\n")
                    continue

            send_to_all(pc_list, command)
        else:
            print("\n  [ERROR] Invalid choice. Please enter 1-6.\n")


if __name__ == "__main__":
    main()
