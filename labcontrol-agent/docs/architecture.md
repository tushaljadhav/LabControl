# LabControl — System Architecture

## Overview

LabControl is a **client-server** system for managing lab PCs over a local area network (LAN). It has two main components:

1. **Agent** — a small Python program that runs on **each lab PC**.
2. **Server / Admin Dashboard** — a central application the administrator uses to send commands to the agents. *(Not built yet — coming in a later step.)*

The two components talk to each other using **TCP sockets** and exchange **JSON messages**. This document explains how the pieces fit together.

---

## Components

### 🖥️ Agent (`agent.py`)

- Runs on every lab PC that the admin wants to control.
- Opens a **TCP socket server** on **port 5555** and waits.
- When it receives a connection, it reads a JSON message, validates the token, and executes the requested power command (shutdown, restart, sleep, or cancel).
- Sends a JSON response back (success, unauthorized, or error).
- Keeps running in an infinite loop — handles one connection, then waits for the next.

**Key point:** The agent does not initiate communication. It only *responds* to incoming requests from the server.

### 🖧 Server (`server.py`) — ✅ Implemented

- Runs on the administrator's PC.
- Reads a list of PCs from `pc_list.json` (name + IP for each PC).
- Provides a console menu to send commands: Shutdown All / Restart All / Sleep All / Cancel All.
- Connects to each agent's IP on port 5555 using a TCP socket.
- Sends JSON commands and reads JSON responses.
- **Sends to all PCs in parallel** using Python's `ThreadPoolExecutor` (see below).
- Prints a clean summary table after each action.

**Key point:** The server is the *initiator*. It reaches out to agents when the admin picks an action.

### 🌐 Admin Dashboard (`app.py`) — ✅ Implemented

- A **Flask web application** that runs on the admin's PC on **port 8080**.
- Provides a modern dark-themed browser dashboard at `http://localhost:8080`.
- Reuses the same `database.py` and `command_sender.py` modules as the CLI server.
- REST API endpoints for sending commands, fetching PC status, and viewing logs.
- The browser-based dashboard is now the **primary interface** — the console menu (`server.py`) remains available as a CLI backup tool.

**Key point:** The dashboard is just a visual layer on top of the same backend logic. Whether you use the CLI or the web UI, the same database and command sender are used.

---

## Multi-Lab Architecture (Step 7)

With Step 7, LabControl has evolved from a simple client-server application to a more robust, multi-tier system with distinct frontend and backend layers:

- **Database (`labs` and `pcs`)**: The SQLite database now includes a `labs` table. PCs are linked to specific labs via a `lab_id` foreign key, allowing grouped management.
- **Backend API (Flask, Port 8080)**: The previous template-rendering Flask app has been converted into a pure REST API. It handles CORS for frontend communication and uses `flask-cors`.
- **Frontend (React/Vite, Port 5173)**: A modern React single-page application built with Vite and Tailwind CSS. It communicates with the Flask REST API via standard `fetch` HTTP requests.

```text
 ┌──────────────────────┐   HTTP / Credentials  ┌──────────────────────┐      TCP:5555      ┌─────────────┐
 │    Browser (React)   │ <──────────────────> │      Flask API       │ <────────────────> │   Agents    │
 │   Dev Server: 5173   │   Session Cookies    │     Port: 8080       │  (Fernet TCP)     │  (Lab PCs)  │
 └──────────────────────┘                      └──────────────────────┘                    └─────────────┘
```

---

## Authentication & Session Management (Step 14)

With Step 14, LabControl includes a secure user authentication layer:

- **Database (`users` table)**: Stores user accounts with password hashes generated via `werkzeug.security.generate_password_hash` (PBKDF2/SHA256).
- **Session Management (`Flask-Login`)**: Manages secure session cookies across API routes. All management endpoints (`/api/labs`, `/api/pcs`, `/api/command`, `/api/wake`, `/api/logs`) require `@login_required`.
- **Frontend Authentication (`AuthContext` & `LoginPage`)**: React Context handles authentication state via `POST /api/login`, `POST /api/logout`, and `GET /api/me`. Automatically attaches `credentials: 'include'` on all API requests.

---

## Two-Factor Authentication (2FA TOTP) Architecture (Step 15)

With Step 15, LabControl provides an optional per-user Two-Factor Authentication (2FA) layer:

- **TOTP Standards (`pyotp` & `qrcode`)**: Uses Time-based One-Time Password (TOTP) algorithm (RFC 6238). Generates base32 secrets and provisioning URIs (`otpauth://`) rendered into base64 PNG QR Code images.
- **Database (`two_factor_secret`, `two_factor_enabled`)**: Stores TOTP secrets and enablement flags on the `users` table.
- **2-Step Login Flow**:
  1. User enters username and password at `POST /api/login`.
  2. If 2FA is enabled, Flask returns `{requires_2fa: true}` and sets a temporary `pending_2fa_user_id` session variable.
  3. React UI switches to 6-digit TOTP verification screen.
  4. User enters code at `POST /api/login/2fa-verify`. If verified, `login_user()` completes session creation.
- **User Management (`SecurityModal.jsx`)**: Authenticated users can open Security Settings to scan QR codes with authenticator apps (Google Authenticator, Authy) or disable 2FA with password confirmation.

---

## How They Communicate

```
 ┌──────────────────────────────────────────────┐
 │          Server  (server.py)                 │
 │  - Reads PC list from pc_list.json           │
 │  - Console menu for admin                    │
 │  - Sends JSON commands via TCP               │
 └──────┬──────────┬──────────┬─────────────────┘
        │          │          │
        │ Thread 1 │ Thread 2 │ Thread 3 ...
        │          │          │     ← All sent in PARALLEL
        │          │          │        (not one by one!)
        ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌────────┐
   │ Agent  │ │ Agent  │ │ Agent  │
   │ PC #1  │ │ PC #2  │ │ PC #3  │  ... more PCs
   │ :5555  │ │ :5555  │ │ :5555  │
   └────────┘ └────────┘ └────────┘
```

### Why parallel? (ThreadPoolExecutor)

Without threads, sending to 40 PCs would take up to 40 × 3 seconds = **120 seconds** (worst case).
With `ThreadPoolExecutor`, all 40 connections happen at the same time, so total time ≈ **3 seconds**
(just the timeout of the slowest PC). Each thread independently handles one PC.

### Step-by-step flow

1. The admin opens the dashboard and clicks "Shutdown" next to PC #2.
2. The server looks up PC #2's IP address (e.g. `192.168.1.42`).
3. The server opens a TCP connection to `192.168.1.42:5555`.
4. The server sends a JSON message: `{"command": "shutdown", "token": "labcontrol-secret-2026"}`
5. The agent on PC #2 receives the message, validates the token, and runs `shutdown /s /t 5`.
6. The agent sends back: `{"status": "success", "command": "shutdown"}`
7. The server updates the dashboard to show that PC #2 is shutting down.
8. The TCP connection is closed.

### Why TCP?

- **Reliable delivery** — TCP guarantees that the message arrives completely and in order. UDP does not.
- **Two-way** — The agent can send a response back on the same connection.
- **Simple** — Python's built-in `socket` module makes TCP easy.

### Why JSON?

- **Human-readable** — easy to debug by printing the raw message.
- **Structured** — supports nested fields, lists, etc. for future expansion.
- **Universal** — every programming language can parse JSON.
- **Lightweight** — our messages are tiny (< 200 bytes), so JSON overhead is irrelevant.

---

## Network Requirements

- All PCs must be on the **same LAN** (or reachable via routing).
- **Port 5555** must be open in the Windows Firewall on each agent PC.
- The admin's PC must be able to reach each agent's IP address.

---

## Security Considerations *(current limitations)*

| Concern | Current Status | Future Plan |
|---------|---------------|-------------|
| Authentication | Hardcoded shared token | Move to hashed tokens or API keys |
| Encryption | None (plaintext TCP) | Add TLS/SSL encryption |
| Authorization | Single token for all commands | Role-based access control |
| Firewall | Manual setup required | Installer script to configure firewall rules |

> This is a learning project. Do not deploy on untrusted networks without adding proper security layers.
