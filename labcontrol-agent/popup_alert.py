"""
LabControl Target PC Popup Alert (v3.6 - Fixed Spacing & Layout)
====================================================================
Standalone GUI popup for Target PCs.
Displays a 10-second top-most floating glassmorphism alert banner with a BIG live countdown
number (10 to 0), a smooth draining progress bar, distinct vibrant color palettes per command,
and a single-click CANCEL button.

Single-Instance Guaranteed: Terminates any old popup instance before displaying so
only ONE popup window ever exists on screen at any time.
"""

import sys
import os
import subprocess
import tkinter as tk
import psutil

class NullWriter:
    def write(self, text):
        pass
    def flush(self):
        pass

sys.stdout = NullWriter()
sys.stderr = NullWriter()
sys.__stdout__ = NullWriter()
sys.__stderr__ = NullWriter()




def kill_previous_popups():
    """Ensure only ONE popup window exists on screen using psutil."""
    try:
        current_pid = os.getpid()
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = proc.info.get('cmdline') or []
                if proc.info['pid'] != current_pid and any("popup_alert.py" in arg for arg in cmdline):
                    proc.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception:
        pass



def main():
    # Enforce single instance
    kill_previous_popups()

    command_name = sys.argv[1] if len(sys.argv) > 1 else "shutdown"
    command_name = command_name.lower().strip()

    # Distinct vibrant color themes per command
    themes = {
        "shutdown": {
            "title": "🛑 SYSTEM SHUTDOWN",
            "accent": "#ff2a5f",       # Crimson Neon Red
            "badge_bg": "#881337",     # Deep Ruby Red
            "bar_color": "#ff4d7d",
            "btn_bg": "#e11d48",
            "btn_hover": "#be123c",
        },
        "restart": {
            "title": "🔄 SYSTEM RESTART",
            "accent": "#c084fc",       # Neon Electric Purple
            "badge_bg": "#581c87",     # Royal Purple
            "bar_color": "#d8b4fe",
            "btn_bg": "#9333ea",
            "btn_hover": "#7e22ce",
        },
        "sleep": {
            "title": "🌙 SYSTEM SLEEP",
            "accent": "#38bdf8",       # Electric Cyan / Sky Blue
            "badge_bg": "#0c4a6e",     # Deep Ocean Blue
            "bar_color": "#38bdf8",
            "btn_bg": "#0284c7",
            "btn_hover": "#0369a1",
        },
    }

    theme = themes.get(command_name, themes["shutdown"])

    try:
        root = tk.Tk()
        root.title("LabControl Alert")

        root.configure(bg="#090d16")
        root.overrideredirect(True) # Borderless floating window

        # Window dimensions & positioning (Center Top) - Expanded width 580px for perfect spacing
        w, h = 580, 130
        screen_w = root.winfo_screenwidth()
        x = (screen_w - w) // 2
        y = 35
        root.geometry(f"{w}x{h}+{x}+{y}")

        # Force Windows OS to generate real HWND handle before setting topmost Z-index
        root.update_idletasks()
        root.deiconify()
        root.attributes("-topmost", True)
        root.lift()
        root.focus_force()
        root.attributes("-topmost", True)


        # Outer container frame with glowing accent border
        frame = tk.Frame(root, bg="#0f172a", highlightbackground=theme["accent"], highlightthickness=2)
        frame.pack(fill="both", expand=True)

        # ── Left side: Big Countdown Badge Box (10 to 0) ───────────────────────
        badge_frame = tk.Frame(frame, bg=theme["badge_bg"], width=82, height=82)
        badge_frame.pack_propagate(False)
        badge_frame.place(relx=0.03, rely=0.45, anchor="w")

        count_number_label = tk.Label(
            badge_frame,
            text="10",
            font=("Segoe UI", 30, "bold"),
            fg="#ffffff",
            bg=theme["badge_bg"]
        )
        count_number_label.pack(expand=True)

        count_unit_label = tk.Label(
            badge_frame,
            text="SECONDS",
            font=("Segoe UI", 7, "bold"),
            fg="#e2e8f0",
            bg=theme["badge_bg"]
        )
        count_unit_label.place(relx=0.5, rely=0.86, anchor="center")

        # ── Middle: Header & Info Text ──────────────────────────────────────────
        info_frame = tk.Frame(frame, bg="#0f172a")
        info_frame.place(relx=0.19, rely=0.45, anchor="w")

        title_label = tk.Label(
            info_frame,
            text=theme["title"],
            font=("Segoe UI", 12, "bold"),
            fg=theme["accent"],
            bg="#0f172a"
        )
        title_label.pack(anchor="w")

        sub_label = tk.Label(
            info_frame,
            text="Triggered remotely by Lab Admin",
            font=("Segoe UI", 9),
            fg="#94a3b8",
            bg="#0f172a"
        )
        sub_label.pack(anchor="w", pady=(2, 0))

        # ── Smooth Progress Bar Canvas at bottom ───────────────────────────────
        canvas_w = w - 4
        canvas_h = 6
        progress_canvas = tk.Canvas(
            frame,
            width=canvas_w,
            height=canvas_h,
            bg="#1e293b",
            highlightthickness=0
        )
        progress_canvas.place(relx=0.0, rely=1.0, anchor="sw")

        progress_bar = progress_canvas.create_rectangle(
            0, 0, canvas_w, canvas_h,
            fill=theme["bar_color"],
            outline=""
        )

        # ── Right side: CANCEL BUTTON ───────────────────────────────────────────
        is_cancelled = False

        def cancel_action():
            nonlocal is_cancelled
            if is_cancelled:
                return
            is_cancelled = True

            # Immediately abort OS shutdown and destroy popup window
            creation_flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            subprocess.run("shutdown /a >nul 2>&1", shell=True, creationflags=creation_flags)
            title_label.configure(text="ACTION ABORTED", fg="#22c55e")
            sub_label.configure(text="Cancelled by PC user", fg="#4ade80")
            cancel_btn.configure(state="disabled", text="ABORTED", bg="#1e293b", fg="#4ade80")

            root.after(700, root.destroy)

        cancel_btn = tk.Button(
            frame,
            text="❌ CANCEL ACTION",
            font=("Segoe UI", 9, "bold"),
            bg=theme["btn_bg"],
            fg="#ffffff",
            activebackground=theme["btn_hover"],
            activeforeground="#ffffff",
            bd=0,
            padx=12,
            pady=7,
            cursor="hand2",
            command=cancel_action
        )
        cancel_btn.place(relx=0.97, rely=0.45, anchor="e")

        # ── Execute Final OS Command at 0s ──────────────────────────────────────
        def execute_os_action():
            if is_cancelled:
                return

            creation_flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            if command_name == "shutdown":
                subprocess.run("shutdown /s /f /t 0", shell=True, creationflags=creation_flags)
            elif command_name == "restart":
                subprocess.run("shutdown /r /f /t 0", shell=True, creationflags=creation_flags)
            elif command_name == "sleep":
                try:
                    subprocess.run("powershell -Command \"Add-Type -Assembly System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)\"", shell=True, creationflags=creation_flags)
                except Exception:
                    subprocess.run("rundll32.exe powrprof.dll,SetSuspendState 0,1,0", shell=True, creationflags=creation_flags)



        # ── 100ms Smooth Countdown Loop ─────────────────────────────────────────
        total_time_ms = 10000.0  # 10 seconds in ms
        time_left_ms = total_time_ms

        def update_smooth_loop():
            nonlocal time_left_ms
            if is_cancelled:
                return

            time_left_ms -= 100
            if time_left_ms < 0:
                time_left_ms = 0

            # Update big number label
            sec_display = int(time_left_ms / 1000) + (1 if time_left_ms % 1000 > 0 else 0)
            count_number_label.configure(text=str(sec_display))

            # Update progress bar width
            current_bar_width = int((time_left_ms / total_time_ms) * canvas_w)
            progress_canvas.coords(progress_bar, 0, 0, current_bar_width, canvas_h)

            # Re-assert topmost so window stays on top
            root.lift()
            root.attributes("-topmost", True)

            if time_left_ms > 0:
                root.after(100, update_smooth_loop)
            else:
                root.destroy()
                execute_os_action()

        update_smooth_loop()
        root.mainloop()

    except Exception as e:
        import traceback
        log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "popup_error.log")
        with open(log_path, "a") as f:
            f.write(traceback.format_exc() + "\n")



if __name__ == "__main__":
    main()
