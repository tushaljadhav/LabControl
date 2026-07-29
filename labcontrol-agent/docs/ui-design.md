# LabControl -- Admin Dashboard UI Design

> **IMPLEMENTED** in Step 6. The dashboard is live at `http://localhost:8080` via the Flask web app in `labcontrol-dashboard/`.

---

## Design Overview

The LabControl Admin Dashboard is a **dark-mode, single-page web interface** built with Flask, vanilla HTML/CSS/JavaScript, and Jinja2 templates. It provides a clean, modern look that prioritizes readability and quick actions.

---

## Layout

```
+------------------------------------------------------------------+
|  [lightning] LabControl               [pulse] Auto-refresh active |
+------------------------------------------------------------------+
|                                                                    |
|  [ Total PCs: 3 ]    [ Online: 2 ]    [ Offline: 1 ]             |
|                                                                    |
|  [Select All] [Deselect]  [Shutdown] [Restart] [Sleep] [Cancel]  [+ Add PC] |
|                                                                    |
|  +--------------------------------------------------------------+ |
|  | [ ] | Name       | IP Address     | Status    | Last Seen    | |
|  |-----|------------|----------------|-----------|--------------|  |
|  | [x] | Lab-PC-01  | 192.168.1.10   | * Online  | 14:30:05     | |
|  | [x] | Lab-PC-02  | 192.168.1.11   | * Online  | 14:30:05     | |
|  | [ ] | Lab-PC-03  | 192.168.1.12   | * Offline | 14:25:10     | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  Recent Activity                                       [Refresh]  |
|  +--------------------------------------------------------------+ |
|  | Lab-PC-01  | shutdown  | SUCCESS | 2026-07-28 14:30:05       | |
|  | Lab-PC-02  | shutdown  | OFFLINE | 2026-07-28 14:30:05       | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

---

## Color Palette (Dark Mode)

| Element | Color | Hex |
|---------|-------|-----|
| Background base | Deep navy | `#0b1120` |
| Surface / cards | Dark gray-blue | `#1e293b` |
| Elevated elements | Medium gray | `#273548` |
| Primary accent | Blue | `#3b82f6` |
| Text (primary) | Near-white | `#f1f5f9` |
| Text (secondary) | Muted gray | `#94a3b8` |
| Online / Success | Green | `#22c55e` |
| Offline / Danger | Red | `#ef4444` |
| Restart / Warning | Amber | `#f59e0b` |
| Sleep / Info | Cyan | `#06b6d4` |

All colors are defined as CSS variables in `style.css` for easy theming.

---

## Key Design Decisions

1. **No heavy frameworks** -- Uses vanilla HTML, CSS, and JavaScript. No React, Vue, Bootstrap, or Tailwind. Keeps it simple for learning.

2. **CSS Variables for theming** -- All colors are defined in `:root` variables. To change the theme, you only edit one section at the top of `style.css`.

3. **Auto-refresh via polling** -- JavaScript calls `/api/pcs` every 5 seconds to update the PC table without reloading the page. This is the simplest approach (vs WebSockets).

4. **Confirmation modals** -- Destructive actions (shutdown, restart) require explicit confirmation. The modal text changes based on the action and number of PCs selected.

5. **Toast notifications** -- Small pop-up messages in the bottom-right corner provide feedback after actions (success, error, info). They auto-dismiss after 4 seconds.

6. **Checkbox selection** -- PCs can be individually selected or bulk-selected. Commands only apply to checked PCs, preventing accidental mass actions.

7. **Google Fonts** -- Uses Inter for UI text and JetBrains Mono for IP addresses and code, loaded from Google Fonts CDN.

---

## Components

### Header Bar
- Logo + "LabControl" brand text on the left
- Live refresh indicator (pulsing green dot) and "Last updated: Xs ago" on the right

### Summary Cards
- Three cards showing Total PCs, Online count, Offline count
- Updated in real-time with auto-refresh

### Action Toolbar
- Select All / Deselect All buttons
- Shutdown (red), Restart (amber), Sleep (cyan), Cancel (gray) command buttons
- "+ Add PC" button to open the add form

### PC Table
- Columns: Checkbox, Name, IP Address, Status (badge), Last Seen
- Status badges with colored dots: green (online), red (offline), amber (error), gray (unknown)
- Online dots have a subtle pulse animation

### Confirmation Modal
- Slide-in overlay with blur backdrop
- Shows action name, PC count, and appropriate button color
- Cancel and Confirm buttons

### Activity Log
- Shows last 20 command log entries
- Columns: PC Name, Command (monospace badge), Status (colored), Timestamp
- Refreshable via button

### Add PC Form
- Hidden by default, toggles open when "+ Add PC" is clicked
- Two fields: PC Name and IP Address
- Submits via API without page reload

### Toast Notifications
- Bottom-right corner
- Three types: success (green), error (red), info (cyan)
- Auto-dismiss after 4 seconds with fade-out animation

---

## Typography

- **UI Font:** Inter (Google Fonts) -- clean, modern sans-serif
- **Monospace:** JetBrains Mono (Google Fonts) -- for IP addresses and command labels
- **Fallbacks:** Segoe UI, system-ui, Consolas

---

## Interactions

- **Hover on table row** -- subtle background highlight
- **Hover on buttons** -- slight lift (translateY -1px) + shadow
- **Status dot pulse** -- green dots gently pulse for online PCs
- **Modal entrance** -- scale + opacity animation (0.2s)
- **Toast entrance** -- slide in from right (0.3s)

---

## Responsive Behavior

- Summary cards stack vertically on narrow screens
- Toolbar wraps to multiple lines
- Add PC form fields stack vertically
- Header padding reduces
