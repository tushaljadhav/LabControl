# LabControl — PC List Format (`pc_list.json`)

## Overview

The `pc_list.json` file tells the LabControl Server which PCs to send commands to. It's a simple JSON array where each entry represents one lab PC.

---

## Format

```json
[
  { "name": "Lab-PC-01", "ip": "192.168.1.10" },
  { "name": "Lab-PC-02", "ip": "192.168.1.11" },
  { "name": "Lab-PC-03", "ip": "192.168.1.12" }
]
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | A human-friendly label for the PC (e.g. `"Lab-PC-01"`, `"Room-B-Desktop"`). Used in console output and the future dashboard. |
| `ip` | string | ✅ Yes | The PC's local network (LAN) IP address (e.g. `"192.168.1.42"`). Must be reachable from the server machine. |

---

## How to Find a PC's IP Address

On each lab PC, open a terminal and run:

```
ipconfig
```

Look for the **IPv4 Address** under the active network adapter. It will look like `192.168.x.x` or `10.x.x.x`.

---

## Rules

- The file must be valid JSON — use a JSON validator if you're unsure.
- Each entry **must** have both `name` and `ip`.
- Names don't have to match the Windows hostname — they're just labels for you.
- IPs must be reachable from the machine running `server.py`.
- You can add as many PCs as you need — the server sends commands in parallel.

---

## Example: Single PC (for testing)

```json
[
  { "name": "My-Laptop", "ip": "127.0.0.1" }
]
```

Using `127.0.0.1` (localhost) lets you test with the agent running on the same machine.

---

## Example: Full Lab

```json
[
  { "name": "Lab-A-01", "ip": "192.168.1.10" },
  { "name": "Lab-A-02", "ip": "192.168.1.11" },
  { "name": "Lab-A-03", "ip": "192.168.1.12" },
  { "name": "Lab-A-04", "ip": "192.168.1.13" },
  { "name": "Lab-A-05", "ip": "192.168.1.14" },
  { "name": "Lab-B-01", "ip": "192.168.2.10" },
  { "name": "Lab-B-02", "ip": "192.168.2.11" },
  { "name": "Lab-B-03", "ip": "192.168.2.12" }
]
```

---

## Future Plans

In a later step, this flat JSON file will be replaced by a **SQLite database** with additional fields:

| Future Field | Purpose |
|-------------|---------|
| `mac_address` | For Wake-on-LAN (sending a magic packet to turn on a PC remotely) |
| `status` | Tracked by the server: `online`, `offline`, `unknown` |
| `last_seen` | Timestamp of the last successful communication |
| `group` | Lab room or group name for organizing PCs in the dashboard |

The `pc_list.json` format is a temporary stepping stone that's easy to edit by hand.
