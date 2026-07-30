"""
LabControl Dashboard (Flask Web App)
=====================================
Pure REST API version with Flask-Login session authentication,
Two-Factor Authentication (2FA TOTP), automatic background health checks,
lab management, PC edit/delete, and Wake-on-LAN (WOL) magic packet endpoints.
"""

import sys
import os
import json
import threading
import time
import io
import base64

import pyotp
import qrcode
from dotenv import load_dotenv

# ──────────────────────────────────────────────────────────────────────────────
# Add the labcontrol-server directory to Python's import path
# ──────────────────────────────────────────────────────────────────────────────
SERVER_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "labcontrol-server")
sys.path.insert(0, SERVER_DIR)

# Load environment variables from .env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=env_path, override=True)

from database import get_all_pcs, get_logs, update_pc_status, add_log, add_pc, update_pc, delete_pc
from database import migrate_add_labs, add_lab, get_all_labs, get_pcs_by_lab, delete_lab, update_lab
from database import migrate_add_users, get_user_by_id, verify_user_password
from database import migrate_add_2fa, set_2fa_secret, enable_2fa, disable_2fa
from database import migrate_add_schedules, add_schedule, get_all_schedules, delete_schedule, toggle_schedule_active
from database import get_pc_by_mac
from command_sender import send_to_pcs, check_pc_health, check_all_pcs_health, send_wol_packet, SECRET_KEY_STR
from file_deployer import deploy_files_to_pcs
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user

app = Flask(__name__)

# Secret key for session management
app.secret_key = os.getenv("FLASK_SECRET_KEY", "labcontrol-session-secret-key-2026")

# Configure CORS to allow cookies/credentials from React frontend on any LAN origin
# Note: `credentials: 'include'` in fetch() requires an EXACT origin match (not wildcard '*').
# Since this is an internal LAN admin tool, we dynamically reflect the requesting Origin header.
CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080"
])

@app.after_request
def add_cors_headers(response):
    """
    Dynamic CORS origin reflection for LAN access.
    When the frontend is accessed via a LAN IP (e.g., http://192.168.1.143:5173),
    flask-cors's static list won't match. This handler reflects the actual Origin
    header back, enabling credentialed cross-origin requests from any LAN device.
    """
    origin = request.headers.get("Origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

# ══════════════════════════════════════════════════════════════════════════════
# Flask-Login Configuration
# ══════════════════════════════════════════════════════════════════════════════
login_manager = LoginManager()
login_manager.init_app(app)

class User(UserMixin):
    """User model wrapper for Flask-Login."""
    def __init__(self, user_dict):
        self.id = str(user_dict["id"])
        self.username = user_dict["username"]
        self.role = user_dict.get("role", "admin")
        self.two_factor_enabled = user_dict.get("two_factor_enabled", False)

@login_manager.user_loader
def load_user(user_id):
    user_dict = get_user_by_id(user_id)
    if not user_dict:
        return None
    return User(user_dict)

@login_manager.unauthorized_handler
def unauthorized_callback():
    """Return JSON 401 when unauthorized access is attempted."""
    return jsonify({"error": "Authentication required", "authenticated": False}), 401


# ══════════════════════════════════════════════════════════════════════════════
# Background Health Checker Thread
# ══════════════════════════════════════════════════════════════════════════════
def background_health_checker():
    """
    Periodically pings all PCs in the database every 3 seconds
    and updates their online/offline status and last_seen timestamp in SQLite.
    """
    while True:
        try:
            pcs = get_all_pcs()
            if pcs:
                results = check_all_pcs_health(pcs)
                for r in results:
                    update_pc_status(r["id"], r["status"])
        except Exception as e:
            print(f"[HEALTH CHECK ERROR] {e}")
        time.sleep(3)


# ══════════════════════════════════════════════════════════════════════════════
# AUTO-DISCOVERY: Agent Heartbeat Endpoint (No Login Required)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/agent/heartbeat", methods=["POST"])
def api_agent_heartbeat():
    """
    Auto-Discovery heartbeat endpoint for Lab PC agents.
    
    NO @login_required — agents don't have user accounts.
    Instead, validates the shared Fernet secret key for authentication.
    
    The agent sends its IP, MAC address, and hostname every 30 seconds.
    - If a PC with this MAC already exists → update its IP (handles DHCP changes!)
    - If this MAC is new → auto-create a new PC entry in 'Unassigned Lab'
    
    Request JSON:
        { "hostname": "LAB-PC-01", "ip": "192.168.1.120", "mac_address": "C4:75:AB:3D:37:9F", "secret_key": "..." }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    # ── Validate secret key (agent authentication) ────────────────────────
    agent_key = (data.get("secret_key") or "").strip()
    if not agent_key or agent_key != SECRET_KEY_STR:
        return jsonify({"error": "Invalid or missing secret key"}), 403

    hostname = (data.get("hostname") or "").strip()
    ip = (data.get("ip") or "").strip()
    mac_address = (data.get("mac_address") or "").strip()

    if not ip or not mac_address:
        return jsonify({"error": "ip and mac_address are required"}), 400

    # ── Check if a PC with this MAC already exists ────────────────────────
    existing_pc = get_pc_by_mac(mac_address)

    if existing_pc:
        # PC exists → update IP if it changed + mark as online
        pc_id = existing_pc["id"]
        old_ip = existing_pc["ip"]

        if old_ip != ip:
            # IP changed (DHCP reassigned!) → auto-update it
            update_pc(pc_id, ip_address=ip)
            print(f"[AUTO-DISCOVERY] IP updated for '{existing_pc['name']}': {old_ip} → {ip}")

        update_pc_status(pc_id, "online")

        return jsonify({
            "status": "success",
            "action": "updated",
            "pc_id": pc_id,
            "name": existing_pc["name"],
            "message": f"Heartbeat OK — IP {'updated to ' + ip if old_ip != ip else 'unchanged'}"
        })

    else:
        # New PC → auto-register with hostname as default name
        # Admin will rename and assign lab later from the Dashboard
        pc_name = hostname or f"Auto-{mac_address[-8:]}"

        # Find the 'Unassigned Lab' to put the new PC in
        all_labs = get_all_labs()
        unassigned_lab = next((l for l in all_labs if l["name"] == "Unassigned Lab"), None)
        default_lab_id = unassigned_lab["id"] if unassigned_lab else None

        pc_id = add_pc(pc_name, ip, mac_address=mac_address, lab_id=default_lab_id)

        if pc_id is None:
            # IP already exists (edge case: different MAC, same IP)
            # Update the existing PC's MAC address instead
            all_pcs = get_all_pcs()
            for pc in all_pcs:
                if pc["ip"] == ip:
                    update_pc(pc["id"], mac_address=mac_address)
                    update_pc_status(pc["id"], "online")
                    return jsonify({
                        "status": "success",
                        "action": "mac_updated",
                        "pc_id": pc["id"],
                        "message": f"MAC address saved for existing PC '{pc['name']}'"
                    })
            return jsonify({"error": "Could not register PC"}), 500

        update_pc_status(pc_id, "online")
        print(f"[AUTO-DISCOVERY] New PC registered: '{pc_name}' ({ip}) MAC={mac_address}")

        return jsonify({
            "status": "success",
            "action": "registered",
            "pc_id": pc_id,
            "name": pc_name,
            "message": f"New PC auto-registered! Admin can rename and assign lab from Dashboard."
        }), 201


# ══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION & 2FA ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/login", methods=["POST"])
def api_login():
    """Authenticates user credentials. If 2FA enabled, sets pending session."""
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user_dict = verify_user_password(username, password)
    if not user_dict:
        return jsonify({"error": "Invalid username or password"}), 401

    # Check if 2FA is enabled for this user
    if user_dict.get("two_factor_enabled"):
        session['pending_2fa_user_id'] = user_dict["id"]
        return jsonify({
            "success": True,
            "requires_2fa": True,
            "message": "Two-factor authentication required"
        })

    user_obj = User(user_dict)
    login_user(user_obj, remember=True)

    return jsonify({
        "success": True,
        "requires_2fa": False,
        "username": user_dict["username"],
        "role": user_dict["role"]
    })

@app.route("/api/login/2fa-verify", methods=["POST"])
def api_login_2fa_verify():
    """Verifies the 6-digit TOTP code during 2FA login flow."""
    user_id = session.get('pending_2fa_user_id')
    if not user_id:
        return jsonify({"error": "No pending 2FA login session found. Please log in again."}), 401

    data = request.get_json() or {}
    code = data.get("code", "").strip().replace(" ", "")

    if not code:
        return jsonify({"error": "6-digit verification code is required"}), 400

    user_dict = get_user_by_id(user_id)
    if not user_dict or not user_dict.get("two_factor_secret"):
        return jsonify({"error": "User 2FA setup not found"}), 400

    totp = pyotp.TOTP(user_dict["two_factor_secret"])
    if not totp.verify(code, valid_window=1):
        return jsonify({"error": "Invalid 6-digit verification code"}), 400

    user_obj = User(user_dict)
    login_user(user_obj, remember=True)
    session.pop('pending_2fa_user_id', None)

    return jsonify({
        "success": True,
        "username": user_dict["username"],
        "role": user_dict["role"]
    })

@app.route("/api/logout", methods=["POST"])
@login_required
def api_logout():
    """Logs out the current user session."""
    logout_user()
    session.pop('pending_2fa_user_id', None)
    return jsonify({"success": True})

@app.route("/api/me", methods=["GET"])
def api_me():
    """Returns currently authenticated user info, or 401 if unauthenticated."""
    if current_user.is_authenticated:
        user_dict = get_user_by_id(current_user.id)
        return jsonify({
            "authenticated": True,
            "username": current_user.username,
            "role": getattr(current_user, "role", "admin"),
            "two_factor_enabled": bool(user_dict.get("two_factor_enabled")) if user_dict else False
        })
    return jsonify({"authenticated": False}), 401

# ── 2FA USER MANAGEMENT ENDPOINTS ─────────────────────────────────────────────

@app.route("/api/2fa/setup", methods=["POST"])
@login_required
def api_2fa_setup():
    """Generates a new TOTP secret and QR Code for the authenticated user."""
    user_dict = get_user_by_id(current_user.id)
    secret = pyotp.random_base32()
    set_2fa_secret(current_user.id, secret)

    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user_dict["username"],
        issuer_name="LabControl"
    )

    img = qrcode.make(totp_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    qr_code_data = f"data:image/png;base64,{qr_b64}"

    return jsonify({
        "success": True,
        "secret": secret,
        "qr_code": qr_code_data
    })

@app.route("/api/2fa/confirm", methods=["POST"])
@login_required
def api_2fa_confirm():
    """Verifies the initial TOTP code to confirm and enable 2FA."""
    data = request.get_json() or {}
    code = data.get("code", "").strip().replace(" ", "")

    user_dict = get_user_by_id(current_user.id)
    secret = user_dict.get("two_factor_secret")
    if not secret:
        return jsonify({"error": "2FA setup not initiated. Click Setup 2FA first."}), 400

    totp = pyotp.TOTP(secret)
    if not totp.verify(code, valid_window=1):
        return jsonify({"error": "Invalid 6-digit code. Check your authenticator app time sync and try again."}), 400

    enable_2fa(current_user.id)
    return jsonify({
        "success": True,
        "message": "Two-Factor Authentication enabled successfully"
    })

@app.route("/api/2fa/disable", methods=["POST"])
@login_required
def api_2fa_disable():
    """Disables 2FA for the current user after password confirmation."""
    data = request.get_json() or {}
    password = data.get("password", "")

    user_dict = get_user_by_id(current_user.id)
    valid_user = verify_user_password(user_dict["username"], password)
    if not valid_user:
        return jsonify({"error": "Incorrect password. 2FA was not disabled."}), 400

    disable_2fa(current_user.id)
    return jsonify({
        "success": True,
        "message": "Two-Factor Authentication disabled successfully"
    })


# ══════════════════════════════════════════════════════════════════════════════
# PROTECTED API ROUTES (Require @login_required)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/labs", methods=["GET"])
@login_required
def api_get_labs():
    """Returns all labs with their PC counts."""
    return jsonify(get_all_labs())

@app.route("/api/labs", methods=["POST"])
@login_required
def api_create_lab():
    """Creates a new lab."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    name = data.get("name", "").strip()
    location = data.get("location", "").strip()

    if not name:
        return jsonify({"error": "'name' is required"}), 400

    lab_id = add_lab(name, location)
    return jsonify({"status": "success", "id": lab_id})

@app.route("/api/labs/<int:lab_id>", methods=["PUT"])
@login_required
def api_update_lab(lab_id):
    """Updates a lab's name and location."""
    data = request.get_json() or {}
    name = data.get("name")
    location = data.get("location")
    result = update_lab(lab_id, name=name, location=location)
    return jsonify(result)

@app.route("/api/labs/<int:lab_id>", methods=["DELETE"])
@login_required
def api_delete_lab(lab_id):
    """Deletes a lab if it has no PCs."""
    result = delete_lab(lab_id)
    if result["status"] == "error":
        return jsonify(result), 400
    return jsonify(result)

@app.route("/api/pcs", methods=["GET"])
@login_required
def api_get_pcs():
    """Return PCs. Filter by lab_id if provided."""
    lab_id = request.args.get("lab_id")
    if lab_id:
        return jsonify(get_pcs_by_lab(int(lab_id)))
    return jsonify(get_all_pcs())

@app.route("/api/pcs", methods=["POST"])
@login_required
def api_add_pc():
    """Add a new PC and immediately test its connection."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    name = (data.get("name") or "").strip()
    ip = (data.get("ip") or "").strip()
    mac = (data.get("mac_address") or "").strip()
    lab_id = data.get("lab_id")

    if not name or not ip:
        return jsonify({"error": "Both 'name' and 'ip' are required"}), 400

    pc_id = add_pc(name, ip, mac_address=mac or None, lab_id=lab_id)
    if pc_id is None:
        return jsonify({"error": f"A PC with IP {ip} already exists"}), 409

    # Immediately check health of the newly added PC
    health = check_pc_health({"id": pc_id, "name": name, "ip": ip})
    update_pc_status(pc_id, health["status"])

    return jsonify({
        "status": "success",
        "message": f"Added {name} ({ip}) - Status: {health['status']}",
        "id": pc_id,
        "pc_status": health["status"]
    })

@app.route("/api/pcs/<int:pc_id>", methods=["PUT"])
@login_required
def api_update_pc(pc_id):
    """Update a PC's details (name, ip, mac_address, lab_id)."""
    data = request.get_json() or {}
    name = data.get("name")
    ip = data.get("ip")
    mac = data.get("mac_address")
    lab_id = data.get("lab_id")

    result = update_pc(pc_id, name=name, ip_address=ip, mac_address=mac, lab_id=lab_id)

    if ip:
        health = check_pc_health({"id": pc_id, "name": name or "PC", "ip": ip})
        update_pc_status(pc_id, health["status"])

    return jsonify(result)

@app.route("/api/pcs/<int:pc_id>", methods=["DELETE"])
@login_required
def api_delete_pc(pc_id):
    """Delete a PC and its logs."""
    result = delete_pc(pc_id)
    return jsonify(result)

@app.route("/api/pcs/ping", methods=["POST"])
@login_required
def api_ping_pcs():
    """Ping all PCs (or selected PCs) immediately to refresh online/offline status."""
    data = request.get_json() or {}
    pc_ids = data.get("pc_ids", "all")

    all_pcs = get_all_pcs()
    if pc_ids == "all":
        target_pcs = all_pcs
    else:
        target_pcs = [pc for pc in all_pcs if pc["id"] in pc_ids]

    results = check_all_pcs_health(target_pcs)
    for r in results:
        update_pc_status(r["id"], r["status"])

    return jsonify({"status": "success", "results": results})

@app.route("/api/wake", methods=["POST"])
@login_required
def api_wake_pcs():
    """Send Wake-on-LAN (WOL) Magic Packets to selected PCs via UDP broadcast."""
    data = request.get_json() or {}
    pc_ids = data.get("pc_ids", [])

    all_pcs = get_all_pcs()
    if pc_ids == "all":
        target_pcs = all_pcs
    else:
        target_pcs = [pc for pc in all_pcs if pc["id"] in pc_ids]

    if not target_pcs:
        return jsonify({"error": "No PCs selected"}), 400

    results = []
    for pc in target_pcs:
        mac = pc.get("mac_address")
        if not mac or not str(mac).strip():
            res = {
                "id": pc["id"],
                "name": pc["name"],
                "ip": pc["ip"],
                "mac_address": None,
                "status": "error",
                "detail": "MAC address not set for this PC"
            }
        else:
            wol_res = send_wol_packet(mac)
            res = {
                "id": pc["id"],
                "name": pc["name"],
                "ip": pc["ip"],
                "mac_address": mac,
                "status": wol_res["status"],
                "detail": wol_res["detail"]
            }
            add_log(pc["id"], "wake", wol_res["status"])

        results.append(res)

    results.sort(key=lambda r: r["name"])

    return jsonify({
        "command": "wake",
        "results": results,
        "summary": {
            "total": len(results),
            "success": sum(1 for r in results if r["status"] == "success"),
            "error": sum(1 for r in results if r["status"] == "error"),
        }
    })

@app.route("/api/logs", methods=["GET"])
@login_required
def api_get_logs():
    """Return recent logs. Filter by lab_id if provided."""
    lab_id = request.args.get("lab_id")
    if lab_id:
        return jsonify(get_logs(limit=20, lab_id=int(lab_id)))
    return jsonify(get_logs(limit=20))

@app.route("/api/command", methods=["POST"])
@login_required
def api_send_command():
    """Send a power command to selected PCs."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    command = data.get("command", "")
    pc_ids = data.get("pc_ids", [])

    valid_commands = ["ping", "shutdown", "restart", "sleep", "cancel"]
    if command not in valid_commands:
        return jsonify({"error": f"Invalid command: {command}"}), 400

    all_pcs = get_all_pcs()
    if pc_ids == "all":
        target_pcs = all_pcs
    else:
        target_pcs = [pc for pc in all_pcs if pc["id"] in pc_ids]

    if not target_pcs:
        return jsonify({"error": "No PCs selected"}), 400

    results = send_to_pcs(target_pcs, command)

    for r in results:
        db_status = "online" if r["status"] == "success" else r["status"]
        update_pc_status(r["id"], db_status)
        add_log(r["id"], command, r["status"])

    return jsonify({
        "command": command,
        "results": results,
        "summary": {
            "total": len(results),
            "success": sum(1 for r in results if r["status"] == "success"),
            "offline": sum(1 for r in results if r["status"] == "offline"),
            "error": sum(1 for r in results if r["status"] in ("error", "unauthorized")),
        }
    })


@app.route("/api/stats", methods=["POST"])
@login_required
def api_get_system_stats():
    """Fetch live CPU, RAM, Disk, and Uptime system stats from selected online PCs."""
    data = request.get_json() or {}
    pc_ids = data.get("pc_ids", "all")

    all_pcs = get_all_pcs()
    if pc_ids == "all":
        target_pcs = all_pcs
    elif isinstance(pc_ids, list):
        target_pcs = [pc for pc in all_pcs if pc["id"] in pc_ids]
    else:
        target_pcs = all_pcs

    if not target_pcs:
        return jsonify({"error": "No PCs found"}), 400

    online_pcs = [pc for pc in target_pcs if pc["status"] != "offline"]
    if not online_pcs:
        return jsonify({"stats": {}})

    results = send_to_pcs(online_pcs, "get_stats")

    stats_map = {}
    for r in results:
        pc_id = r["id"]
        if r["status"] == "success" and "data" in r:
            stats_map[pc_id] = r["data"]
            update_pc_status(pc_id, "online")
        else:
            update_pc_status(pc_id, "offline")

    return jsonify({"stats": stats_map})


@app.route("/api/launch-app", methods=["POST"])
@login_required
def api_launch_app():
    """Remotely launch an application on target PCs."""
    data = request.get_json() or {}
    pc_ids = data.get("pc_ids", [])
    app_path = data.get("app_path", "").strip()

    if not app_path:
        return jsonify({"error": "No application path provided"}), 400

    all_pcs = get_all_pcs()
    if pc_ids == "all":
        target_pcs = all_pcs
    elif isinstance(pc_ids, list):
        target_pcs = [pc for pc in all_pcs if pc["id"] in pc_ids]
    else:
        target_pcs = all_pcs

    if not target_pcs:
        return jsonify({"error": "No PCs selected"}), 400

    results = send_to_pcs(target_pcs, "launch_app", extra_params={"app_path": app_path})

    for r in results:
        db_status = "online" if r["status"] == "success" else r["status"]
        update_pc_status(r["id"], db_status)
        add_log(r["id"], f"Launch App: {app_path}", r["status"])

    return jsonify({"results": results})


@app.route("/api/close-app", methods=["POST"])
@login_required
def api_close_app():
    """Remotely close an application process on target PCs."""
    data = request.get_json() or {}
    pc_ids = data.get("pc_ids", [])
    app_name = data.get("app_name", "").strip()

    if not app_name:
        return jsonify({"error": "No process name provided"}), 400

    all_pcs = get_all_pcs()
    if pc_ids == "all":
        target_pcs = all_pcs
    elif isinstance(pc_ids, list):
        target_pcs = [pc for pc in all_pcs if pc["id"] in pc_ids]
    else:
        target_pcs = all_pcs

    if not target_pcs:
        return jsonify({"error": "No PCs selected"}), 400

    results = send_to_pcs(target_pcs, "close_app", extra_params={"app_name": app_name})

    for r in results:
        db_status = "online" if r["status"] == "success" else r["status"]
        update_pc_status(r["id"], db_status)
        add_log(r["id"], f"Close App: {app_name}", r["status"])

    return jsonify({"results": results})


@app.route("/api/deploy-file", methods=["POST"])
@login_required
def api_deploy_file():
    """Deploy uploaded files/folders to target PCs concurrently."""
    pc_ids_raw = request.form.get("pc_ids", "all")
    dest_dir = request.form.get("dest_dir", "Desktop").strip()

    if pc_ids_raw == "all":
        pc_ids = "all"
    else:
        try:
            pc_ids = json.loads(pc_ids_raw)
        except Exception:
            pc_ids = "all"

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files uploaded for deployment"}), 400

    file_items = []
    for f in files:
        filename = f.filename or "file.bin"
        content = f.read()
        file_items.append({
            "filename": filename,
            "bytes": content,
            "filesize": len(content)
        })

    all_pcs = get_all_pcs()
    if pc_ids == "all":
        target_pcs = all_pcs
    elif isinstance(pc_ids, list):
        target_pcs = [pc for pc in all_pcs if pc["id"] in pc_ids]
    else:
        target_pcs = all_pcs

    if not target_pcs:
        return jsonify({"error": "No PCs selected for deployment"}), 400

    results = deploy_files_to_pcs(target_pcs, file_items, dest_dir=dest_dir)

    for r in results:
        db_status = "online" if r["status"] == "success" else r["status"]
        if "id" in r and r["id"]:
            update_pc_status(r["id"], db_status)
            add_log(r["id"], f"Deployed file: {r.get('filename', 'file')}", r["status"])

    return jsonify({"results": results})


# ══════════════════════════════════════════════════════════════════════════════
# SCHEDULED ACTIONS BACKGROUND EXECUTION & API ROUTES (Feature 1)
# ══════════════════════════════════════════════════════════════════════════════

def check_and_execute_schedules():
    """
    Cron job function executed every minute by APScheduler.
    Checks `schedules` table for active schedules matching current HH:MM and day of week.
    """
    now = datetime.now()
    current_time = now.strftime("%H:%M")
    current_day = now.strftime("%a") # e.g. "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"

    try:
        schedules = get_all_schedules()
        for s in schedules:
            if not s["is_active"]:
                continue

            if s["scheduled_time"] != current_time:
                continue

            days = [d.strip() for d in s["days_of_week"].split(",")]
            if current_day not in days and "All" not in days:
                continue

            command = s["command"]
            lab_id = s["lab_id"]
            lab_name = s["lab_name"]

            if lab_id:
                pcs = get_pcs_by_lab(lab_id)
            else:
                pcs = get_all_pcs()

            if not pcs:
                print(f"[SCHEDULE JOB] No PCs found for scheduled {command} on {lab_name}")
                continue

            print(f"[SCHEDULE EXECUTED] Running scheduled {command} on {len(pcs)} PC(s) ({lab_name})")

            results = send_to_pcs(pcs, command)
            
            for r in results:
                db_status = "online" if r["status"] == "success" else r["status"]
                update_pc_status(r["id"], db_status)
                add_log(r["id"], f"Scheduled {command.title()}", r["status"])

    except Exception as e:
        print(f"[SCHEDULE EXECUTION ERROR] {e}")


@app.route("/api/schedules", methods=["GET"])
@login_required
def api_get_schedules():
    """Get list of all scheduled actions."""
    schedules = get_all_schedules()
    return jsonify(schedules)


@app.route("/api/schedules", methods=["POST"])
@login_required
def api_add_schedule():
    """Create a new scheduled action."""
    data = request.json or {}
    lab_id = data.get("lab_id")
    command = data.get("command", "").strip()
    scheduled_time = data.get("scheduled_time", "").strip()
    days_of_week = data.get("days_of_week", "").strip()

    valid_commands = ["shutdown", "restart", "sleep"]
    if command not in valid_commands:
        return jsonify({"error": f"Invalid command. Must be one of {valid_commands}"}), 400

    if not scheduled_time or len(scheduled_time) != 5 or ":" not in scheduled_time:
        return jsonify({"error": "Invalid time format. Use HH:MM (24-hour)"}), 400

    if not days_of_week:
        return jsonify({"error": "At least one day of week must be selected"}), 400

    schedule_id = add_schedule(lab_id, command, scheduled_time, days_of_week)
    return jsonify({"success": True, "schedule_id": schedule_id, "message": "Schedule created successfully"}), 201


@app.route("/api/schedules/<int:schedule_id>", methods=["DELETE"])
@login_required
def api_delete_schedule(schedule_id):
    """Delete a scheduled action."""
    delete_schedule(schedule_id)
    return jsonify({"success": True, "message": f"Schedule #{schedule_id} deleted"})


@app.route("/api/schedules/<int:schedule_id>/toggle", methods=["POST"])
@login_required
def api_toggle_schedule(schedule_id):
    """Toggle is_active state of a schedule."""
    new_state = toggle_schedule_active(schedule_id)
    return jsonify({"success": True, "is_active": new_state})


if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("  LabControl REST API Server (Flask-Login + 2FA + APScheduler)")
    print("=" * 50)

    # Ensure database tables exist
    migrate_add_labs()
    migrate_add_users()
    migrate_add_2fa()
    migrate_add_schedules()

    # Start background health checker daemon thread
    health_thread = threading.Thread(target=background_health_checker, daemon=True)
    health_thread.start()
    print("  [HEALTH CHECK] Background ping monitor started (3s interval).")

    # Start APScheduler background cron job
    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(check_and_execute_schedules, 'interval', minutes=1, id='schedules_checker')
    scheduler.start()
    print("  [SCHEDULES] APScheduler background job started (1m interval).")

    print("  Running on: http://0.0.0.0:8080")
    print("  Press Ctrl+C to stop.")
    print("=" * 50 + "\n")

    app.run(host="0.0.0.0", port=8080, debug=True)

