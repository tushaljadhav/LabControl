# LabControl

**Centralized power management for lab PCs over a local network.**

LabControl lets a system administrator remotely shut down, restart, or put to sleep any PC on the lab's LAN — all from a single dashboard. Each lab PC runs a lightweight **Agent** that listens for commands, while the admin operates through a central **Server / Dashboard** (coming in a later step).

> ⚠️ **This is a learning / test version.** It is built as a hands-on networking project and is **not** hardened for production use. The secret token is hardcoded, there is no encryption (TLS), and the commands are Windows-specific. Use it only on your own lab network.

---

## Quick Start — Running the Agent

### Prerequisites

- Python 3.6 or newer
- Windows OS

### Steps

1. Open a terminal (Command Prompt or PowerShell) on the lab PC.
2. Navigate to the project folder:
   ```
   cd labcontrol-agent
   ```
3. Run the agent:
   ```
   python agent.py
   ```
4. The agent will print a banner and start listening on **port 5555**.

### Finding Your PC's Local IP Address

You need to know the PC's LAN IP so the admin server can reach it.

```
ipconfig
```

Look for the **IPv4 Address** under your active network adapter (usually `Ethernet` or `Wi-Fi`). It will look something like `192.168.1.42`.

### Sending a Test Command (from another terminal or PC)

You can test the agent with a simple Python one-liner:

```python
import socket, json

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(("AGENT_IP_HERE", 5555))
s.sendall(json.dumps({"command": "cancel", "token": "labcontrol-secret-2026"}).encode())
print(s.recv(4096).decode())
s.close()
```

Replace `AGENT_IP_HERE` with the agent PC's IP. Use the `"cancel"` command first — it's safe because it only cancels a pending shutdown (does nothing if there isn't one).

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [architecture.md](architecture.md) | System architecture and component overview |
| [protocol.md](protocol.md) | JSON message protocol specification |
| [database-schema.md](database-schema.md) | Planned SQLite database schema (not yet implemented) |
| [ui-design.md](ui-design.md) | Planned Admin Dashboard UI design (not yet implemented) |
| [changelog.md](changelog.md) | Running log of all project changes |

---

## Project Structure

```
labcontrol-agent/
├── agent.py          # The TCP socket agent (runs on each lab PC)
└── docs/
    ├── README.md          # This file
    ├── architecture.md    # System design overview
    ├── protocol.md        # JSON protocol spec
    ├── database-schema.md # Future database plan
    ├── ui-design.md       # Future UI design plan
    └── changelog.md       # Version history
```
