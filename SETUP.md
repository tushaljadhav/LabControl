# LabControl Setup & User Guide

This guide covers setting up the LabControl dashboard, running all components, agent installation, and Wake-on-LAN (WOL).

---

## 📋 Prerequisites (One-Time Install)

| Software | Version | Download |
|----------|---------|----------|
| **Python** | 3.6 or higher | https://www.python.org/downloads/ |
| **Node.js** | 18 or higher | https://nodejs.org/ |

---

## 🚀 How to Start LabControl (Every Time)

You need to run **2 things on your Admin PC** (in 2 separate terminals).

### 🖥️ Terminal 1 — Flask Backend API Server

```powershell
cd c:\Users\Tushal\Desktop\LabControl\labcontrol-dashboard
python app.py
```

- ✅ Runs on: **http://localhost:8080**
- ✅ This is the backend API that talks to all Lab PC agents
- ✅ Keep this terminal OPEN (don't close it)

### 🌐 Terminal 2 — React Frontend Dashboard

```powershell
cd c:\Users\Tushal\Desktop\LabControl\labcontrol-frontend
npm run dev
```

- ✅ Runs on: **http://localhost:5173**
- ✅ This is the Dashboard UI you open in the browser
- ✅ Keep this terminal OPEN (don't close it)

### 🌍 Step 3 — Open the Dashboard

Open your browser and go to:
- **From your own PC:** `http://localhost:5173`
- **From any other PC on same Wi-Fi/LAN:** `http://<your-pc-ip>:5173` (e.g., `http://192.168.1.143:5173`)

### 🔐 Default Login Credentials

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `admin` |

> ⚠️ Change the default password after first login for security!

---

## 🤖 Terminal 3 — Agent (Target/Dost ke Lab PC par)

This runs on **each Lab PC you want to control** (NOT on your Admin PC).

### First-Time Setup (One Time Only)

1. Copy the entire `labcontrol-agent` folder to the target Lab PC.
2. Open a terminal on that Lab PC and run:

```powershell
cd labcontrol-agent
pip install -r requirements.txt
```

3. Create a `.env` file inside `labcontrol-agent` folder with this content:

```env
LABCONTROL_SECRET_KEY=mRBEOUI43W4N2BWOjGPhT46c-GR6QC5MZRcVXVipnwc=
LABCONTROL_SERVER_URL=http://192.168.1.143:8080
```

| Variable | Value | Description |
|----------|-------|-------------|
| `LABCONTROL_SECRET_KEY` | Must match server's key | Security encryption key |
| `LABCONTROL_SERVER_URL` | `http://<admin-pc-ip>:8080` | Admin PC ka IP + port (for Auto-Discovery) |

> ⚠️ Secret key MUST match the server's key, otherwise PC will show as "Unauth".
> 
> 💡 `LABCONTROL_SERVER_URL` mein apne Admin PC ka IP daalo (jo `ipconfig` se milta hai).

### 🔄 Auto-Discovery (Automatic IP + MAC Registration)

Jab agent start hota hai, yeh **automatically**:
1. Apna **IP address**, **MAC address**, aur **Computer Name** detect karta hai
2. Har **30 seconds** mein server ko bhejta hai
3. **Dashboard mein PC automatically appear** ho jata hai! 🎉
4. Agar IP change ho jaye (DHCP) → **automatically update** ho jayega

**Admin sirf yeh karta hai:**
- PC ka **Name** edit kare (e.g., "Rahul-PC")
- PC ko **Lab assign** kare (e.g., "Lab 1")

### Run the Agent (Every Time)

**Option A — Manual Run (Terminal):**
```powershell
cd labcontrol-agent
python agent.py
```
- ✅ Listens on Port **5555** (Commands: shutdown, restart, sleep, cancel, stats, apps)
- ✅ Listens on Port **5556** (File transfers: deploy files/folders)
- ✅ Keep this terminal OPEN on the Lab PC

**Option B — Auto-Start on Boot (Recommended for Lab PCs):**
1. Right-click **`install_agent.bat`** → **Run as Administrator**
2. Done! Agent will silently auto-start every time the PC boots.

**To Stop/Uninstall Auto-Start:**
- Run **`uninstall_agent.bat`** as Administrator.

---

## 📡 Adding a Lab PC to Dashboard

After the agent is running on a Lab PC:

1. Find the Lab PC's IP address:
   - On the Lab PC, open CMD and type: `ipconfig`
   - Note the **IPv4 Address** (e.g., `192.168.1.120`)

2. On your Dashboard:
   - Click **"+ Add PC"**
   - Enter PC Name (e.g., `Rahul-PC`)
   - Enter IP Address (e.g., `192.168.1.120`)
   - Select Lab
   - Click **Add PC**

3. Click **"Check Status"** 🔄 — the PC should show **🟢 ONLINE**

---

## 🎯 What You Can Do from Dashboard

| Feature | Button | Description |
|---------|--------|-------------|
| **Check Status** | 🔄 Check Status | Ping all PCs to see online/offline |
| **Shutdown** | ⏻ Shutdown | Shutdown selected PCs (10s countdown) |
| **Restart** | 🔄 Restart | Restart selected PCs (10s countdown) |
| **Sleep** | 🌙 Sleep | Put selected PCs to sleep (10s countdown) |
| **Wake-on-LAN** | ⚡ Wake Selected | Turn ON powered-off PCs remotely |
| **Live Stats** | 📈 Stats button on PC row | View CPU, RAM, Disk, Uptime live |
| **Remote Apps** | 🚀 Remote Apps | Launch/Close apps on PCs (Calculator, Notepad, etc.) |
| **Deploy Files** | 📦 Deploy Files | Send files/folders to all PCs |
| **Schedules** | 🕐 Schedules | Auto shutdown/restart at specific times |
| **2FA Security** | 🔒 Security in Sidebar | Enable Google Authenticator for login |

---

## 🛑 How to Stop LabControl

| What | How to Stop |
|------|------------|
| **Terminal 1 (Backend)** | Press `Ctrl + C` in the terminal |
| **Terminal 2 (Frontend)** | Press `Ctrl + C` in the terminal |
| **Terminal 3 (Agent)** | Press `Ctrl + C` on the Lab PC |

---

## ⚡ Wake-on-LAN (WOL) Complete Setup Guide

Wake-on-LAN allows turning on powered-off or sleeping PCs remotely across the network.

### Step 1: Find the Target PC's MAC Address
On the Target PC:
1. Press `Win + R`, type `cmd`, and press Enter.
2. Type `getmac` (or `ipconfig /all`).
3. Note the active **Physical Address** (e.g. `C4-75-AB-3D-37-9F`).

### Step 2: Save MAC Address in LabControl
1. Open the Dashboard at `http://localhost:5173`.
2. Click **✏️ Edit** on the PC's row.
3. Paste the MAC Address in the **MAC Address** field (e.g. `C4-75-AB-3D-37-9F`).
4. Click **Save Changes**.

### Step 3: Enable WOL in Windows Device Manager
1. Press `Win + X` ➔ Open **Device Manager**.
2. Expand **Network adapters**.
3. Right-click your network card:
   - For LAN/Ethernet Cable: **`Realtek PCIe GbE Family Controller`** (or Intel Ethernet)
   - For Wi-Fi: **`Intel(R) Wi-Fi 6 AX201`**
4. Click **Properties** (If a `🛡️ Change settings` button appears at the bottom left, click it).
5. **Advanced Tab:** Select **`Wake on Magic Packet`** ➔ set Value to **`Enabled`**.
6. **Power Management Tab:** Check **`Allow this device to wake the computer`**.
7. Click **OK**.

### Step 4: Enable WOL in BIOS/UEFI (For Full Shutdown Wake)
1. Restart the PC and enter BIOS (`F2` or `Del`).
2. Navigate to **Power Management** or **Advanced Settings**.
3. Set **`Wake on LAN`** (or *Power On By PCIe*) to **`Enabled`**.
4. Save and Exit.

---

### 💡 Desktop PCs vs Laptops Behavior:

- **Desktop PCs (Ethernet LAN Cable):** Ethernet ports maintain standby motherboard power even when fully **Shut Down (Off)**. `⚡ Wake Selected` will turn ON fully shutdown lab PCs!
- **Wi-Fi Laptops:** Laptops turn off Wi-Fi power during full shutdown to preserve battery. Wi-Fi laptops wake up from **Sleep / Standby Mode** (or Lid Closed).

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| PC shows **Unauth** | `.env` file missing or secret key mismatch — check both server & agent `.env` files |
| PC shows **Offline** | Agent not running on that PC, or PC not on same network |
| Dashboard won't open | Make sure Terminal 1 (`python app.py`) and Terminal 2 (`npm run dev`) are both running |
| Commands not working | Restart both `app.py` and `agent.py` |
| Port already in use | Close all terminals, then re-run |
