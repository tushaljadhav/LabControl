"""
LabControl Agent (v3.0 - Fernet Encrypted & Brute-Force Hardened)
===================================================================
This script runs a TCP socket server that listens for power-management commands
(shutdown, restart, sleep, cancel) sent over the local network.

Security Features (v3.0):
1. Fernet Symmetric Encryption: All socket traffic is encrypted with a shared secret key
   loaded from `.env`. Plain-text commands are rejected.
2. Brute-Force Rate Limiter & IP Lockout: If an IP address accumulates 5 failed
   decryption attempts within 60 seconds, it is automatically locked out for 5 minutes (300s).
3. Single-Instance & 10s Floating Banner: Executes commands safely with user cancellation.

Usage:
  python agent.py
"""

import sys         # For Python executable path
import os          # For script & environment paths

# Safe NullWriter for GUI/pythonw execution (where sys.stdout/stderr might be None)
if sys.stdout is None:
    class NullWriter:
        def write(self, text):
            pass
        def flush(self):
            pass
    sys.stdout = NullWriter()

if sys.stderr is None:
    class NullWriter:
        def write(self, text):
            pass
        def flush(self):
            pass
    sys.stderr = NullWriter()


import socket      # For TCP server and connections
import json        # For JSON payload parsing
import subprocess  # For OS commands & launching popup process
import time        # For rate-limiting & lockout timestamps
import struct      # For unpacking binary header lengths (file transfer protocol)
import uuid        # For auto-detecting MAC address
import psutil      # For live CPU/RAM/Disk/Uptime metrics
import threading   # For background file server thread


from dotenv import load_dotenv
from cryptography.fernet import Fernet, InvalidToken

# Load environment variables from .env file in the script's directory
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=env_path, override=True)


# ──────────────────────────────────────────────────────────────────────────────
# Network & Encryption Configuration
# ──────────────────────────────────────────────────────────────────────────────
HOST = "0.0.0.0"   # Listen on ALL network interfaces (LAN + localhost)
PORT = 5555         # The port number our agent listens on
BUFFER_SIZE = 4096  # Max bytes to read per socket chunk

# Load Fernet Secret Key from environment (.env)
SECRET_KEY_STR = os.getenv("LABCONTROL_SECRET_KEY")
if not SECRET_KEY_STR:
    # Fallback key for default testing if .env is missing
    SECRET_KEY_STR = "mRBEOUI43W4N2BWOjGPhT46c-GR6QC5MZRcVXVipnwc="

try:
    fernet = Fernet(SECRET_KEY_STR.encode("utf-8"))
except Exception as err:
    print(f"[FATAL SECURITY ERROR] Invalid Fernet Key in .env: {err}")
    sys.exit(1)

# Path to the standalone popup alert script
POPUP_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "popup_alert.py")
VALID_COMMANDS = ["ping", "shutdown", "restart", "sleep", "cancel", "get_stats", "launch_app", "close_app", "get_installed_apps"]

# ──────────────────────────────────────────────────────────────────────────────
# Auto-Discovery: Server URL & Network Info Detection
# ──────────────────────────────────────────────────────────────────────────────
# The agent sends its IP, MAC, and hostname to the server every 30 seconds.
# Set this in .env: LABCONTROL_SERVER_URL=http://<admin-pc-ip>:8080
LABCONTROL_SERVER_URL = os.getenv("LABCONTROL_SERVER_URL", "").strip()
HEARTBEAT_INTERVAL = 30  # Send heartbeat every 30 seconds


def get_local_ip():
    """
    Auto-detect this PC's LAN IP address.
    Connects to an external IP (doesn't send data) to determine
    which local network interface is used for outgoing traffic.
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2)
        s.connect(("8.8.8.8", 80))  # Google DNS — no actual data sent
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "127.0.0.1"


def get_mac_address():
    """
    Auto-detect this PC's MAC address using Python's built-in uuid module.
    Returns formatted MAC string like 'C4:75:AB:3D:37:9F'.
    """
    try:
        mac_int = uuid.getnode()
        mac_str = ":".join(f"{(mac_int >> (8 * i)) & 0xFF:02X}" for i in reversed(range(6)))
        return mac_str
    except Exception:
        return None


def heartbeat_sender():
    """
    Background thread that sends auto-discovery heartbeats to the LabControl server.
    Runs every 30 seconds. If server is unreachable, silently retries next interval.
    Uses built-in urllib — no pip install needed!
    """
    from urllib.request import Request, urlopen
    from urllib.error import URLError

    heartbeat_url = f"{LABCONTROL_SERVER_URL}/api/agent/heartbeat"
    hostname = socket.gethostname()

    print(f"  [AUTO-DISCOVERY] Heartbeat sender started → {heartbeat_url}")
    print(f"  [AUTO-DISCOVERY] This PC: hostname={hostname}")

    while True:
        try:
            local_ip = get_local_ip()
            mac_address = get_mac_address()

            payload = json.dumps({
                "hostname": hostname,
                "ip": local_ip,
                "mac_address": mac_address,
                "secret_key": SECRET_KEY_STR
            }).encode("utf-8")

            req = Request(
                heartbeat_url,
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )

            response = urlopen(req, timeout=5)
            resp_data = json.loads(response.read().decode("utf-8"))

            action = resp_data.get("action", "")
            if action == "registered":
                print(f"  [AUTO-DISCOVERY] ✅ Registered as new PC: '{resp_data.get('name')}' (id={resp_data.get('pc_id')})")
            elif action == "updated" and "updated to" in resp_data.get("message", ""):
                print(f"  [AUTO-DISCOVERY] 🔄 IP auto-updated on server: {local_ip}")
            # Silent for normal heartbeats (no spam)

        except URLError:
            pass  # Server unreachable — silently retry next interval
        except Exception as e:
            print(f"  [AUTO-DISCOVERY] Heartbeat error: {e}")

        time.sleep(HEARTBEAT_INTERVAL)


def get_installed_applications():
    """
    Scans Windows Registry & common shortcuts to return a list of installed applications.
    Returns: List of dicts [{"name": "Google Chrome", "cmd": "chrome"}, ...]
    """
    apps = []
    seen = set()

    # Preset common Windows apps
    preset_apps = [
        {"name": "Google Chrome", "cmd": "chrome"},
        {"name": "Microsoft Edge", "cmd": "msedge"},
        {"name": "Visual Studio Code", "cmd": "code"},
        {"name": "Notepad", "cmd": "notepad"},
        {"name": "Calculator", "cmd": "calc"},
        {"name": "MS Paint", "cmd": "mspaint"},
        {"name": "MS Word", "cmd": "winword"},
        {"name": "MS Excel", "cmd": "excel"},
        {"name": "MS PowerPoint", "cmd": "powerpnt"},
        {"name": "Command Prompt", "cmd": "cmd"},
        {"name": "File Explorer", "cmd": "explorer"},
        {"name": "Task Manager", "cmd": "taskmgr"},
        {"name": "VLC Media Player", "cmd": "vlc"},
        {"name": "Snipping Tool", "cmd": "snippingtool"},
        {"name": "Control Panel", "cmd": "control"},
    ]

    for p in preset_apps:
        apps.append(p)
        seen.add(p["name"].lower())

    if os.name == "nt":
        try:
            import winreg
            registry_paths = [
                (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
                (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
                (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall")
            ]

            for hkey, subkey in registry_paths:
                try:
                    key = winreg.OpenKey(hkey, subkey)
                    for i in range(winreg.QueryInfoKey(key)[0]):
                        try:
                            sub_name = winreg.EnumKey(key, i)
                            sub_key = winreg.OpenKey(key, sub_name)
                            app_name, _ = winreg.QueryValueEx(sub_key, "DisplayName")

                            if app_name and app_name.strip() and app_name.lower() not in seen:
                                exe_path = ""
                                try:
                                    icon, _ = winreg.QueryValueEx(sub_key, "DisplayIcon")
                                    if icon and ".exe" in icon.lower():
                                        exe_path = icon.split(",")[0].strip('"')
                                except Exception:
                                    pass

                                if not exe_path:
                                    try:
                                        loc, _ = winreg.QueryValueEx(sub_key, "InstallLocation")
                                        if loc:
                                            exe_path = loc.strip()
                                    except Exception:
                                        pass

                                cmd = exe_path if exe_path else app_name
                                apps.append({"name": app_name.strip(), "cmd": cmd})
                                seen.add(app_name.lower())
                            winreg.CloseKey(sub_key)
                        except Exception:
                            continue
                    winreg.CloseKey(key)
                except Exception:
                    continue
        except Exception as err:
            print(f"[REGISTRY SCAN ERROR] {err}")

    apps.sort(key=lambda x: x["name"].lower())
    return apps


# ──────────────────────────────────────────────────────────────────────────────
# In-Memory Brute-Force Rate Limiter & IP Lockout Tracker
# ──────────────────────────────────────────────────────────────────────────────
# Maps IP address -> list of failed attempt timestamps: { "192.168.1.50": [t1, t2, ...] }
failed_attempts = {}
# Maps IP address -> lockout expiration timestamp: { "192.168.1.50": 178523000.0 }
lockout_until = {}


def is_ip_locked_out(ip_str):
    """
    Check if an IP address is currently locked out due to security rate-limiting policy.
    Policy: 5 failed decryption/auth attempts in 60 seconds -> 5 minute (300s) IP lockout.
    """
    now = time.time()
    if ip_str in lockout_until:
        if now < lockout_until[ip_str]:
            return True
        else:
            # Lockout expired — clear state
            del lockout_until[ip_str]
            failed_attempts[ip_str] = []
    return False


def record_failed_attempt(ip_str):
    """
    Record a failed decryption attempt and trigger a 5-minute lockout if 5+ attempts occur within 60s.
    """
    now = time.time()
    attempts = failed_attempts.get(ip_str, [])

    # Keep only failed attempt timestamps from the last 60 seconds
    attempts = [t for t in attempts if now - t <= 60]
    attempts.append(now)
    failed_attempts[ip_str] = attempts

    if len(attempts) >= 5:
        lockout_until[ip_str] = now + 300  # Lockout for 300 seconds (5 minutes)
        print(f"🔒 [SECURITY ALERT / LOCKOUT] IP {ip_str} locked out for 5 minutes (300s) due to {len(attempts)} failed authentication attempts.")


def send_encrypted_response(client_socket, response_dict):
    """
    Encrypt a JSON response payload with Fernet before transmitting over the wire.
    """
    try:
        response_json = json.dumps(response_dict)
        encrypted_bytes = fernet.encrypt(response_json.encode("utf-8"))
        client_socket.sendall(encrypted_bytes)
    except Exception as e:
        print(f"[RESPONSE ERROR] Failed to send encrypted response: {e}")


def handle_client(client_socket, client_address):
    """
    Handle a single client connection with Fernet decryption & brute-force rate-limiting.
    """
    client_ip = client_address[0]

    # Reject connection immediately if IP is currently locked out
    if is_ip_locked_out(client_ip):
        print(f"🛑 [SECURITY LOCKOUT] Rejected request from locked-out IP: {client_ip}")
        client_socket.close()
        return

    try:
        raw_encrypted_data = client_socket.recv(BUFFER_SIZE)
        if not raw_encrypted_data:
            return

        # ── 1. Decrypt incoming Fernet payload ────────────────────────────────
        try:
            decrypted_bytes = fernet.decrypt(raw_encrypted_data)
        except InvalidToken:
            print(f"⚠️ [SECURITY WARNING] Decryption failed for {client_address}! Invalid secret key or tampered data.")
            record_failed_attempt(client_ip)
            send_encrypted_response(client_socket, {"status": "unauthorized", "message": "Decryption failed"})
            return
        except Exception as e:
            print(f"⚠️ [SECURITY ERROR] Unexpected decryption error for {client_address}: {e}")
            record_failed_attempt(client_ip)
            send_encrypted_response(client_socket, {"status": "error", "message": "Decryption error"})
            return

        # ── 2. Parse JSON payload ─────────────────────────────────────────────
        try:
            message = json.loads(decrypted_bytes.decode("utf-8"))
        except Exception:
            send_encrypted_response(client_socket, {"status": "error", "message": "Invalid JSON format"})
            return

        command = str(message.get("command", "")).lower().strip()
        if command not in VALID_COMMANDS:
            send_encrypted_response(client_socket, {"status": "error", "message": f"Unknown command: {command}"})
            return

        print(f"[EXEC] Valid encrypted command received from {client_address}: {command}")

        # ── 3. Execute requested action ───────────────────────────────────────
        if command in ("shutdown", "restart", "sleep"):
            try:
                pythonw_bin = sys.executable.replace("python.exe", "pythonw.exe")
                if not os.path.exists(pythonw_bin):
                    pythonw_bin = sys.executable

                creation_flags = 0x08000000 if os.name == "nt" else 0  # CREATE_NO_WINDOW for taskkill only
                subprocess.run("taskkill /F /FI \"WINDOWTITLE eq LabControl Alert\" >nul 2>&1", shell=True, creationflags=creation_flags)
                
                # Launch GUI popup using pythonw.exe without CREATE_NO_WINDOW flag so Tkinter window renders on desktop!
                proc = subprocess.Popen([pythonw_bin, POPUP_SCRIPT, command])
                print(f"[INFO] Target PC Popup Alert launched on desktop (PID {proc.pid}) for command: {command}")
            except Exception as e:
                print(f"[POPUP ERROR] Could not launch popup: {e}")





        elif command == "cancel":
            try:
                subprocess.run("taskkill /F /FI \"WINDOWTITLE eq LabControl Alert\" >nul 2>&1", shell=True)
                subprocess.run("shutdown /a >nul 2>&1", shell=True)
                print(f"[INFO] Cancel command processed. Active alerts killed and shutdown aborted.")
            except Exception as e:
                print(f"[CANCEL ERROR] {e}")

        elif command == "get_stats":
            try:
                cpu_usage = psutil.cpu_percent(interval=0.3)
                cpu_cores = psutil.cpu_count(logical=True) or 1
                mem = psutil.virtual_memory()
                ram_usage = mem.percent
                ram_total_gb = round(mem.total / (1024 ** 3), 1)
                ram_used_gb = round(mem.used / (1024 ** 3), 1)

                drive_path = "C:\\" if os.name == "nt" else "/"
                disk = psutil.disk_usage(drive_path)
                disk_usage = disk.percent
                disk_total_gb = round(disk.total / (1024 ** 3), 1)
                disk_used_gb = round(disk.used / (1024 ** 3), 1)

                uptime_hours = round((time.time() - psutil.boot_time()) / 3600, 1)
                process_count = len(psutil.pids())

                # Active OS Username
                users = psutil.users()
                logged_user = users[0].name if users else os.getenv("USERNAME", "Unknown")

                # OS Platform
                import platform
                os_info = f"{platform.system()} {platform.release()}"

                # Network I/O
                net_io = psutil.net_io_counters()
                net_sent_mb = round(net_io.bytes_sent / (1024 ** 2), 1)
                net_recv_mb = round(net_io.bytes_recv / (1024 ** 2), 1)

                stats_data = {
                    "cpu_usage": cpu_usage,
                    "cpu_cores": cpu_cores,
                    "ram_usage": ram_usage,
                    "ram_total_gb": ram_total_gb,
                    "ram_used_gb": ram_used_gb,
                    "disk_usage": disk_usage,
                    "disk_total_gb": disk_total_gb,
                    "disk_used_gb": disk_used_gb,
                    "uptime_hours": uptime_hours,
                    "process_count": process_count,
                    "logged_user": logged_user,
                    "os_info": os_info,
                    "net_sent_mb": net_sent_mb,
                    "net_recv_mb": net_recv_mb
                }

                send_encrypted_response(client_socket, {
                    "status": "success",
                    "command": "get_stats",
                    "data": stats_data
                })
                return
            except Exception as e:
                print(f"[STATS ERROR] {e}")
                send_encrypted_response(client_socket, {"status": "error", "message": str(e)})
                return

        elif command == "launch_app":
            app_path = message.get("app_path", "").strip()
            if not app_path:
                send_encrypted_response(client_socket, {"status": "error", "message": "No application path provided"})
                return

            try:
                # ── Safe & Native Desktop Launch ──────────────────────────────────────────
                # On Windows, os.startfile() uses native ShellExecute API (exact same as double-clicking in Explorer).
                # It opens apps/files safely on the active user desktop without altering any settings or data.
                if os.name == "nt" and hasattr(os, "startfile"):
                    try:
                        os.startfile(app_path)
                    except Exception:
                        # Fallback for executables in PATH (e.g. calc.exe, notepad.exe)
                        subprocess.Popen(f'cmd.exe /c start "" "{app_path}"', shell=True)
                else:
                    subprocess.Popen(app_path, shell=True)

                print(f"[LAUNCH APP] Safely launched '{app_path}' on active user desktop")
                send_encrypted_response(client_socket, {
                    "status": "success",
                    "command": "launch_app",
                    "message": f"Successfully launched '{app_path}'"
                })
                return
            except Exception as e:
                print(f"[LAUNCH APP ERROR] Failed to launch '{app_path}': {e}")
                send_encrypted_response(client_socket, {"status": "error", "message": str(e)})
                return

        elif command == "close_app":
            app_name = message.get("app_name", "").strip()
            if not app_name:
                send_encrypted_response(client_socket, {"status": "error", "message": "No process name provided"})
                return

            # Ensure .exe extension for Windows taskkill if needed
            target_exe = app_name if app_name.lower().endswith(".exe") else f"{app_name}.exe"

            try:
                # ── Graceful Close Only (Zero Data Loss) ──────────────────────────────────
                # We use taskkill WITHOUT /F (force) so Windows sends WM_CLOSE to the window.
                # If a user has unsaved files, Notepad/App will display standard "Save Changes" prompt!
                if os.name == "nt":
                    res = subprocess.run(
                        f'taskkill /IM "{target_exe}"',
                        shell=True,
                        capture_output=True,
                        text=True
                    )
                    output_msg = res.stdout.strip() or res.stderr.strip() or f"Sent close signal to '{target_exe}'"
                else:
                    closed_count = 0
                    for proc in psutil.process_iter(['pid', 'name']):
                        try:
                            pname = (proc.info['name'] or '').lower()
                            if pname == target_exe.lower():
                                proc.terminate() # Graceful SIGTERM
                                closed_count += 1
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            continue
                    output_msg = f"Closed {closed_count} process instance(s) matching '{target_exe}'"

                print(f"[CLOSE APP] Gracefully closed '{target_exe}': {output_msg}")
                send_encrypted_response(client_socket, {
                    "status": "success",
                    "command": "close_app",
                    "message": f"Closed '{target_exe}' gracefully (unsaved data preserved)"
                })
                return
            except Exception as e:
                print(f"[CLOSE APP ERROR] Failed to close '{app_name}': {e}")
                send_encrypted_response(client_socket, {"status": "error", "message": str(e)})
                return

        elif command == "get_installed_apps":
            try:
                apps_list = get_installed_applications()
                print(f"[INSTALLED APPS] Scanned {len(apps_list)} installed applications")
                send_encrypted_response(client_socket, {
                    "status": "success",
                    "command": "get_installed_apps",
                    "data": apps_list
                })
                return
            except Exception as e:
                print(f"[INSTALLED APPS ERROR] {e}")
                send_encrypted_response(client_socket, {"status": "error", "message": str(e)})
                return

        send_encrypted_response(client_socket, {"status": "success", "command": command})

    except Exception as e:
        print(f"[ERROR] Unexpected error handling {client_address}: {e}")

    finally:
        client_socket.close()


def handle_file_transfer_client(client_socket, client_address):
    """
    Handles incoming file deployment streams on dedicated port 5556.
    Receives 4-byte length prefix, Fernet-encrypted JSON header, then streams binary file chunks.
    """
    client_ip = client_address[0]

    # Brute-force check
    if is_ip_locked_out(client_ip):
        print(f"[SECURITY BLOCKED] Rejecting file connection from locked out IP: {client_ip}")
        client_socket.close()
        return

    try:
        client_socket.settimeout(30.0)

        # ── 1. Read 4-byte header length ──────────────────────────────────────
        header_len_bytes = client_socket.recv(4)
        if not header_len_bytes or len(header_len_bytes) < 4:
            client_socket.close()
            return

        header_len = struct.unpack("!I", header_len_bytes)[0]

        # ── 2. Read Fernet-encrypted JSON header ─────────────────────────────
        encrypted_header = b""
        while len(encrypted_header) < header_len:
            chunk = client_socket.recv(min(4096, header_len - len(encrypted_header)))
            if not chunk:
                break
            encrypted_header += chunk

        try:
            decrypted_header = fernet.decrypt(encrypted_header)
            header = json.loads(decrypted_header.decode("utf-8"))
        except InvalidToken:
            record_failed_attempt(client_ip)
            print(f"[SECURITY ALERT] Invalid Fernet token for file transfer from {client_ip}")
            client_socket.close()
            return

        relative_filename = header.get("filename", "file.bin")
        filesize = int(header.get("filesize", 0))
        dest_dir_key = header.get("dest_dir", "Desktop")

        # ── 3. Resolve Target Directory ──────────────────────────────────────
        home_dir = os.path.expanduser("~")
        if dest_dir_key.lower() == "desktop":
            base_dir = os.path.join(home_dir, "Desktop")
        elif dest_dir_key.lower() == "downloads":
            base_dir = os.path.join(home_dir, "Downloads")
        elif dest_dir_key.lower() == "documents":
            base_dir = os.path.join(home_dir, "Documents")
        else:
            base_dir = os.path.abspath(dest_dir_key)

        target_file_path = os.path.normpath(os.path.join(base_dir, relative_filename))
        os.makedirs(os.path.dirname(target_file_path), exist_ok=True)

        print(f"[FILE TRANSFER] Receiving '{relative_filename}' ({filesize} bytes) -> '{target_file_path}'")

        # ── 4. Stream Binary Data Chunks ─────────────────────────────────────
        bytes_received = 0
        with open(target_file_path, "wb") as f:
            while bytes_received < filesize:
                remaining = filesize - bytes_received
                chunk = client_socket.recv(min(65536, remaining))
                if not chunk:
                    break
                f.write(chunk)
                bytes_received += len(chunk)

        print(f"[FILE SUCCESS] Successfully saved '{relative_filename}' ({bytes_received} bytes) at '{target_file_path}'")

        # Send Fernet-encrypted confirmation
        send_encrypted_response(client_socket, {
            "status": "success",
            "message": f"Successfully deployed '{relative_filename}' ({bytes_received} bytes)",
            "path": target_file_path
        })

    except Exception as e:
        print(f"[FILE ERROR] Error receiving file from {client_ip}: {e}")
        try:
            send_encrypted_response(client_socket, {"status": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        client_socket.close()


FILE_PORT = 5556

def start_file_server():
    """
    Dedicated TCP File Listener running in a daemon thread on port 5556.
    """
    file_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    file_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        file_socket.bind((HOST, FILE_PORT))
        file_socket.listen(10)
        print(f"  File Transfer Listener on {HOST}:{FILE_PORT}")

        while True:
            client_socket, client_address = file_socket.accept()
            t = threading.Thread(target=handle_file_transfer_client, args=(client_socket, client_address), daemon=True)
            t.start()
    except Exception as e:
        print(f"[FILE SERVER ERROR] {e}")


def start_agent():
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((HOST, PORT))
    server_socket.listen(5)

    # Start File Transfer Listener on port 5556 in a background thread
    file_thread = threading.Thread(target=start_file_server, daemon=True)
    file_thread.start()

    # Start Auto-Discovery Heartbeat sender (if server URL is configured)
    if LABCONTROL_SERVER_URL:
        heartbeat_thread = threading.Thread(target=heartbeat_sender, daemon=True)
        heartbeat_thread.start()

    print("=" * 65)
    print("  LabControl Agent (v3.1 - Auto-Discovery + Fernet Encrypted)")
    print("=" * 65)
    print(f"  Command Listener on {HOST}:{PORT}")
    print(f"  File Transfer Listener on {HOST}:{FILE_PORT}")
    print(f"  Encryption: Fernet (AES-128-CBC + HMAC-SHA256)")
    print(f"  Brute-Force Protection: Active (5 fails / 60s -> 5m lockout)")
    if LABCONTROL_SERVER_URL:
        print(f"  Auto-Discovery: ON → {LABCONTROL_SERVER_URL} (every {HEARTBEAT_INTERVAL}s)")
        print(f"  Local IP: {get_local_ip()} | MAC: {get_mac_address()} | Host: {socket.gethostname()}")
    else:
        print(f"  Auto-Discovery: OFF (set LABCONTROL_SERVER_URL in .env to enable)")
    print(f"  Waiting for encrypted commands & file deployments...")
    print("  Press Ctrl+C to stop the agent.")
    print("=" * 65)
    print()

    try:
        while True:
            client_socket, client_address = server_socket.accept()
            handle_client(client_socket, client_address)

    except KeyboardInterrupt:
        print("\n[INFO] Agent stopped by user.")

    finally:
        server_socket.close()


if __name__ == "__main__":
    start_agent()
