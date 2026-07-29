"""
LabControl One-Time Admin User Setup Script
============================================
Run this script manually in the terminal to create the initial admin user account.

Usage:
  cd labcontrol-dashboard
  python create_admin_user.py
"""

import sys
import os
import getpass

# Add labcontrol-server to path
SERVER_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "labcontrol-server")
sys.path.insert(0, SERVER_DIR)

from database import migrate_add_users, create_user, get_user_by_username

def main():
    print("=" * 60)
    print("  LabControl Admin User Setup")
    print("=" * 60)
    
    # Ensure database table exists
    migrate_add_users()

    username = input("Enter admin username [default: admin]: ").strip() or "admin"
    
    existing = get_user_by_username(username)
    if existing:
        print(f"\n[!] Warning: User '{username}' already exists in database.")
        overwrite = input("Do you want to reset password for this user? (y/N): ").strip().lower()
        if overwrite != 'y':
            print("Operation cancelled.")
            return

    password = getpass.getpass("Enter admin password: ").strip()
    if not password:
        print("[!] Error: Password cannot be empty.")
        return

    password_confirm = getpass.getpass("Confirm admin password: ").strip()
    if password != password_confirm:
        print("[!] Error: Passwords do not match.")
        return

    result = create_user(username, password, role="admin")
    if result["status"] == "success":
        print("\n" + "=" * 60)
        print(f"  SUCCESS! Admin user '{username}' created successfully.")
        print("  You can now log into LabControl Dashboard with these credentials.")
        print("=" * 60 + "\n")
    else:
        print(f"\n[!] Error creating user: {result.get('message')}")

if __name__ == "__main__":
    main()
