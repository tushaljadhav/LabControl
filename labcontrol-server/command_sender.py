"""
LabControl Command Sender (Shared Module - Fernet Encrypted)
=============================================================
This module contains the core networking logic for sending Fernet-encrypted
commands to PC agents and ultra-fast parallel health/status checks.
"""

import socket   # For TCP connections to each agent
import json     # For encoding/decoding JSON messages
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
from cryptography.fernet import Fernet, InvalidToken

# Load environment variables from .env file in server directory
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=env_path, override=True)

# ──────────────────────────────────────────────────────────────────────────────
# Security & Network Configuration
# ──────────────────────────────────────────────────────────────────────────────
AGENT_PORT = 5555            # The port every agent listens on
CONNECTION_TIMEOUT = 3       # Seconds for heavy power commands
PING_TIMEOUT = 0.8           # Fast 800ms timeout for health checks (LAN speeds)
MAX_WORKERS = 20             # Max threads running at the same time

# Load Fernet Secret Key from environment (.env)
SECRET_KEY_STR = os.getenv("LABCONTROL_SECRET_KEY")
if not SECRET_KEY_STR:
    # Default fallback key for testing if .env is missing
    SECRET_KEY_STR = "mRBEOUI43W4N2BWOjGPhT46c-GR6QC5MZRcVXVipnwc="

try:
    fernet = Fernet(SECRET_KEY_STR.encode("utf-8"))
except Exception as err:
    print(f"[FATAL SECURITY ERROR] Invalid Fernet Key in server .env: {err}")
    fernet = None


def send_command(pc, command, timeout=CONNECTION_TIMEOUT, extra_params=None):
    """
    Send a single Fernet-encrypted command to a single PC's agent and return the result.
    Supports optional extra_params dictionary (e.g. app_path, app_name).
    """
    result = {
        "id": pc.get("id"),
        "name": pc["name"],
        "ip": pc["ip"],
        "status": "unknown",
    }

    if not fernet:
        result["status"] = "error"
        result["detail"] = "Server Fernet key misconfigured"
        return result

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect((pc["ip"], AGENT_PORT))

        # ── 1. Encrypt JSON command payload with Fernet ───────────────────────
        payload_dict = {"command": command}
        if extra_params and isinstance(extra_params, dict):
            payload_dict.update(extra_params)

        payload = json.dumps(payload_dict)
        encrypted_bytes = fernet.encrypt(payload.encode("utf-8"))
        s.sendall(encrypted_bytes)

        # ── 2. Read and decrypt agent's response ──────────────────────────────
        raw_response = s.recv(4096)
        if not raw_response:
            result["status"] = "offline"
            result["detail"] = "Empty response received"
            s.close()
            return result

        try:
            decrypted_response = fernet.decrypt(raw_response)
            response = json.loads(decrypted_response.decode("utf-8"))
        except InvalidToken:
            result["status"] = "unauthorized"
            result["detail"] = "Agent failed decryption (Secret key mismatch or lockout)"
            s.close()
            return result

        if response.get("status") == "success":
            result["status"] = "success"
            if "data" in response:
                result["data"] = response["data"]
            if "message" in response:
                result["message"] = response["message"]
        elif response.get("status") == "unauthorized":
            result["status"] = "unauthorized"
        else:
            result["status"] = "error"
            result["detail"] = response.get("message", "Unknown error from agent")

        s.close()

    except socket.timeout:
        result["status"] = "offline"
        result["detail"] = f"Connection timed out after {timeout}s"
    except ConnectionRefusedError:
        result["status"] = "offline"
        result["detail"] = f"Connection refused by {pc['ip']}:{AGENT_PORT}"
    except Exception as e:
        result["status"] = "offline"
        result["detail"] = str(e)

    return result


def send_to_pcs(pc_list, command, extra_params=None):
    """
    Send a command to multiple PCs in parallel using ThreadPoolExecutor.
    """
    results = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_pc = {
            executor.submit(send_command, pc, command, CONNECTION_TIMEOUT, extra_params): pc
            for pc in pc_list
        }

        for future in as_completed(future_to_pc):
            try:
                results.append(future.result())
            except Exception as e:
                pc = future_to_pc[future]
                results.append({
                    "id": pc.get("id"),
                    "name": pc["name"],
                    "ip": pc["ip"],
                    "status": "error",
                    "detail": str(e)
                })

    results.sort(key=lambda r: r["name"])
    return results


def check_pc_health(pc):
    """
    Fast health check ping for a single PC (uses 800ms timeout).
    """
    return send_command(pc, "ping", timeout=PING_TIMEOUT)


def check_all_pcs_health(pc_list):
    """
    Fast health check ping for all PCs in parallel.
    """
    results = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_pc = {
            executor.submit(check_pc_health, pc): pc
            for pc in pc_list
        }

        for future in as_completed(future_to_pc):
            try:
                results.append(future.result())
            except Exception as e:
                pc = future_to_pc[future]
                results.append({
                    "id": pc.get("id"),
                    "name": pc["name"],
                    "ip": pc["ip"],
                    "status": "offline",
                    "detail": str(e)
                })

    results.sort(key=lambda r: r["name"])
    return results


def send_wol_packet(mac_address, target_ip=None):
    """
    Send a Wake-on-LAN (WOL) Magic Packet to a target MAC address.
    Sends multi-broadcast packets over ports 7 and 9, and to both global broadcast (255.255.255.255)
    and local subnet broadcast (e.g. 192.168.1.255) for maximum Wi-Fi & LAN wake-up reliability.
    """
    if not mac_address or not str(mac_address).strip():
        return {"status": "error", "detail": "MAC address not set for this PC"}

    clean_mac = str(mac_address).replace(":", "").replace("-", "").replace(".", "").strip()

    if len(clean_mac) != 12:
        return {"status": "error", "detail": f"Invalid MAC address format: {mac_address}"}

    try:
        mac_bytes = bytes.fromhex(clean_mac)
        magic_packet = b'\xff' * 6 + mac_bytes * 16

        # Determine target subnet broadcast (e.g., 192.168.1.255 if IP is 192.168.1.121)
        broadcast_targets = ["255.255.255.255", "<broadcast>"]
        if target_ip and "." in str(target_ip):
            parts = str(target_ip).split(".")
            if len(parts) == 4:
                subnet_broadcast = f"{parts[0]}.{parts[1]}.{parts[2]}.255"
                broadcast_targets.append(subnet_broadcast)

        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            # Send across all broadcast targets and ports (7 & 9) multiple times
            for bcast in broadcast_targets:
                for port in (9, 7):
                    for _ in range(3):
                        try:
                            sock.sendto(magic_packet, (bcast, port))
                        except Exception:
                            pass

        return {"status": "success", "detail": f"Magic Packet sent to {mac_address}"}

    except Exception as e:
        return {"status": "error", "detail": f"Failed to send WOL packet: {str(e)}"}

