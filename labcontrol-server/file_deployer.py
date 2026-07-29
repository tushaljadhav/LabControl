"""
file_deployer.py — Server Module for Concurrent File Deployment to Agent PCs over Port 5556
"""

import os
import sys
import json
import socket
import struct
from concurrent.futures import ThreadPoolExecutor
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

# Load environment variables
server_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(server_dir, ".env")
load_dotenv(dotenv_path)

SECRET_KEY_STR = os.getenv("LABCONTROL_SECRET_KEY", "mRBEOUI43W4N2BWOjGPhT46c-GR6QC5MZRcVXVipnwc=")
FILE_PORT = 5556
TRANSFER_TIMEOUT = 60.0
MAX_WORKERS = 20

try:
    fernet = Fernet(SECRET_KEY_STR.encode("utf-8"))
except Exception as err:
    print(f"[FATAL SECURITY ERROR] Invalid Fernet Key in file_deployer.py: {err}")
    fernet = None


def send_file_to_pc(pc, file_bytes, relative_filename, filesize, dest_dir="Desktop"):
    """
    Sends a single file to a single target PC over dedicated TCP port 5556.
    """
    result = {
        "id": pc.get("id"),
        "name": pc["name"],
        "ip": pc["ip"],
        "filename": relative_filename,
        "status": "unknown",
    }

    if not fernet:
        result["status"] = "error"
        result["detail"] = "Server Fernet key misconfigured"
        return result

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(TRANSFER_TIMEOUT)
        s.connect((pc["ip"], FILE_PORT))

        # ── 1. Create Fernet-encrypted JSON Header ────────────────────────────
        header_payload = json.dumps({
            "filename": relative_filename,
            "filesize": filesize,
            "dest_dir": dest_dir
        }).encode("utf-8")

        encrypted_header = fernet.encrypt(header_payload)
        header_len = len(encrypted_header)

        # 4-byte big-endian header length prefix
        s.sendall(struct.pack("!I", header_len))
        s.sendall(encrypted_header)

        # ── 2. Stream Binary Data Chunks ──────────────────────────────────────
        chunk_size = 65536
        offset = 0
        while offset < filesize:
            chunk = file_bytes[offset:offset + chunk_size]
            if not chunk:
                break
            s.sendall(chunk)
            offset += len(chunk)

        # ── 3. Read Agent Response ───────────────────────────────────────────
        raw_response = s.recv(4096)
        if not raw_response:
            result["status"] = "offline"
            result["detail"] = "No response from agent after file upload"
            s.close()
            return result

        try:
            decrypted_response = fernet.decrypt(raw_response)
            response = json.loads(decrypted_response.decode("utf-8"))
            if response.get("status") == "success":
                result["status"] = "success"
                result["message"] = response.get("message", "File deployed successfully")
                result["path"] = response.get("path", "")
            else:
                result["status"] = "error"
                result["detail"] = response.get("message", "File deployment failed")
        except InvalidToken:
            result["status"] = "unauthorized"
            result["detail"] = "Decryption error on agent response"

        s.close()

    except socket.timeout:
        result["status"] = "offline"
        result["detail"] = f"Transfer timed out after {TRANSFER_TIMEOUT}s"
    except ConnectionRefusedError:
        result["status"] = "offline"
        result["detail"] = f"Connection refused on port {FILE_PORT}"
    except Exception as e:
        result["status"] = "error"
        result["detail"] = str(e)

    return result


def deploy_files_to_pcs(pc_list, file_items, dest_dir="Desktop"):
    """
    Deploys a list of file items (dicts with 'bytes', 'filename', 'filesize')
    to target PCs concurrently.
    """
    all_results = []
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = []
        for pc in pc_list:
            for item in file_items:
                f_bytes = item["bytes"]
                rel_name = item["filename"]
                f_size = item["filesize"]
                futures.append(executor.submit(send_file_to_pc, pc, f_bytes, rel_name, f_size, dest_dir))

        for future in futures:
            try:
                res = future.result()
                all_results.append(res)
            except Exception as ex:
                all_results.append({"status": "error", "detail": str(ex)})

    return all_results
