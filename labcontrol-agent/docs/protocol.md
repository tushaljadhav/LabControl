# LabControl — Network Protocol & Security Documentation

## Overview

LabControl uses two distinct communication mechanisms to manage target PCs across the Local Area Network (LAN):

1. **TCP Socket Connection (Port 5555)** — used for `ping`, `shutdown`, `restart`, `sleep`, and `cancel` commands. Secured with **Fernet Symmetric Encryption**.
2. **UDP Broadcast (Port 9)** — used for `wake` (Wake-on-LAN Magic Packet).

---

## Command Protocols & Security Comparison

| Property | Standard Power Commands | Wake-on-LAN (WOL) |
| :--- | :--- | :--- |
| **Command Types** | `ping`, `shutdown`, `restart`, `sleep`, `cancel` | `wake` |
| **Protocol** | **TCP** (Transmission Control Protocol) | **UDP** (User Datagram Protocol) |
| **Port** | `5555` | `9` (Standard WOL port) |
| **Target Address** | Specific Target PC LAN IP | `<broadcast>` (255.255.255.255) |
| **Target State** | Target PC must be **Powered ON** with `agent.py` running | Target PC can be **Powered OFF** (S5 state) |
| **Authentication & Confidentiality** | **Fernet AES-128-CBC + HMAC-SHA256 Encryption** | Hardware MAC address match |
| **Response** | Encrypted JSON response from agent (`success`/`error`) | Connectionless (No response from turned-off PC) |

---

## 🔒 Security Architecture (v3.0 Security Hardening)

### 1. Fernet Symmetric Encryption
All TCP socket payloads transmitted between the Admin Dashboard/Server and Target Agents are encrypted end-to-end using **Fernet** (`cryptography.fernet.Fernet`):
- **Cipher**: AES-128 in CBC mode with PKCS7 padding.
- **Authentication**: HMAC using SHA256 for integrity verification.
- **Key Storage**: Shared secret key (`LABCONTROL_SECRET_KEY`) stored in `.env` files on both Agent and Server machines. Never committed to version control.

### 2. Removal of Plain-Text Token
The previous plain-text `SECRET_TOKEN = "labcontrol-secret-2026"` has been **completely removed**:
- **Why?** Plain-text tokens transmitted over unencrypted TCP sockets were visible to any network sniffer (e.g. Wireshark/tcpdump) on the LAN. Hardcoding secret tokens in source code also posed serious security risks if pushed to public repositories.
- **New Mechanism**: The encryption itself serves as authentication. Only a client possessing the exact shared Fernet key can produce a ciphertext that the agent can successfully decrypt and execute.

### 3. Brute-Force Protection & IP Lockout
To defend against automated network attacks and unauthorized decryption attempts:
- **Rate-Limiting Policy**: The agent tracks failed decryption/authentication attempts per client IP address in memory.
- **Threshold**: If an IP accumulates **5 or more failed attempts within 60 seconds**, the agent automatically locks out that IP address for **5 minutes (300 seconds)**.
- **Behavior**: All subsequent requests from a locked-out IP are immediately dropped and logged as a security alert (`[SECURITY LOCKOUT]`).

---

## Wake-on-LAN (UDP Broadcast) Specification

When waking a powered-off PC, no agent software is running on the target machine. Instead, the server transmits a **WOL Magic Packet** as a UDP broadcast over port 9.

### Magic Packet Structure (102 Bytes):
- **Header**: 6 bytes of `0xFF` (`\xff\xff\xff\xff\xff\xff`)
- **Payload**: 16 repetitions of the target PC's 6-byte hardware MAC address.

---

## 📋 Step-by-Step Practical Setup & Testing Guide

### Step 1: Find Target PC MAC Address
On target PC, run `getmac` in CMD and copy the active **Physical Address** (e.g. `C4-75-AB-3D-37-9F`).

### Step 2: Save MAC Address in LabControl
Open Dashboard ➔ Click **✏️ Edit** on PC row ➔ Paste MAC Address ➔ Click **Save Changes**.

### Step 3: Windows Network Adapter Settings
1. Open Device Manager (`Win + X`).
2. Expand **Network Adapters**.
3. Right-click **`Realtek PCIe GbE Family Controller`** (or Wi-Fi adapter) ➔ **Properties**.
4. (Click `🛡️ Change settings` if prompted).
5. **Advanced Tab:** Set **`Wake on Magic Packet`** to **`Enabled`**.
6. **Power Management Tab:** Check **`Allow this device to wake the computer`**.
7. Click **OK**.

### Step 4: BIOS/UEFI Settings (For Full Shutdown Wake)
1. Reboot PC into BIOS (`F2` / `Del`).
2. Navigate to **Power Management** ➔ Enable **`Wake on LAN`** / **`Power On By PCIe`**.

### Step 5: Desktop PCs vs Laptops Behavior
- **Desktop PCs (Ethernet LAN Cable):** Wakes up from full **Shutdown (Off)** state.
- **Wi-Fi Laptops:** Wakes up from **Sleep / Standby Mode** (or Lid Closed).
