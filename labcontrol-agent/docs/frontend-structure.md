# LabControl — React Frontend Component Structure

## Overview
The React frontend replaces the previous Flask-rendered templates with a modern Single Page Application (SPA).

## Tech Stack
- **Build Tool:** Vite
- **Framework:** React
- **Styling:** Tailwind CSS v4
- **Icons:** lucide-react

## Architecture & Configuration
- **Folder Structure:** All components are located in `src/components/`
- **API Base URL:** `http://localhost:8080` (Flask REST API)
- **Auto-Refresh Interval:** 5 seconds (fetches updated PC status from the backend)

## Component Tree & Responsibilities

- **`App.jsx`**
  Root component. Manages the selected lab state, handles layout (renders Sidebar and LabDashboard).

- **`Sidebar.jsx`**
  Displays the lab navigation list, including an "All Labs" option and a "+ New Lab" button to create additional labs.

- **`LabDashboard.jsx`**
  The main content area. Manages PC data fetching, auto-refresh interval (5 seconds), and conditionally renders summary/action/PC table components based on the selected lab.

- **`SummaryCards.jsx`**
  Displays quick metrics (Total PCs, Online PCs, Offline PCs).

- **`ActionToolbar.jsx`**
  Command buttons (Shutdown, Restart, Sleep, Cancel) and controls to select all / deselect PCs.

- **`PCTable.jsx`**
  Displays the PC list with selection checkboxes, status badges, and a lab column.

- **`ActivityLog.jsx`**
  Shows a table of recent commands sent and their results.

- **`AddLabModal.jsx`**
  Modal form for creating a new lab.

- **`AddPCModal.jsx`**
  Modal form for adding a PC, including a dropdown for assigning it to a specific lab.

- **`ConfirmActionModal.jsx`**
  Confirmation dialog shown before executing destructive actions like Shutdown or Restart on selected PCs.
