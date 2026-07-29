# LabControl Setup & User Guide

This guide covers setting up the LabControl dashboard, background agents, and Wake-on-LAN (WOL).

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.6+**
- **Node.js 18+**

### Step 1: Start the Flask Backend
Open a terminal and run:

```bash
cd labcontrol-dashboard
pip install -r requirements.txt
python app.py
```
*(Runs on port 8080)*

### Step 2: Start the React Frontend
Open a **SECOND** terminal window and run:

```bash
cd labcontrol-frontend
npm install
npm run dev
```
*(Runs on port 5173)*

### Step 3: Access the Dashboard
Open your web browser and navigate to:
**`http://localhost:5173`**

---

## 🖥️ Target PC Agent Installation

To control target PCs automatically on system boot:

1. Copy the `labcontrol-agent` folder to the target PC.
2. Right-click **`install_agent.bat`** and select **"Run as Administrator"**.
3. Done! The agent will run silently in the background and automatically start whenever the PC boots or restarts.

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
