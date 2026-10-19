#!/usr/bin/env python3
"""
Freqtrade Desktop GUI Test Runner
Built with CustomTkinter for local strategy execution, multi-threaded matrix testing,
and comprehensive log analysis with true monospace alignment, font scaling, and theme controls.
Run with: python gui_runner.py
"""
import os
import subprocess
import sys
import threading
from pathlib import Path
from run_test import RunTest, Tonification, HAS_CTK

if not HAS_CTK:
    print("[ERROR] customtkinter is required for gui_runner.py.")
    print("Install via: pip install customtkinter")
    sys.exit(1)

import customtkinter as ctk

# Default appearance settings
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

# Theme palette configurations for instant dynamic recoloring
THEME_PALETTES = {
    "Blue": {
        "primary": ("#2563eb", "#3b82f6"),
        "hover": ("#1d4ed8", "#2563eb"),
        "accent": ("#0284c7", "#38bdf8"),
        "run": ("#10b981", "#10b981"),
        "run_hover": ("#059669", "#059669"),
    },
    "Green": {
        "primary": ("#059669", "#10b981"),
        "hover": ("#047857", "#059669"),
        "accent": ("#059669", "#34d399"),
        "run": ("#059669", "#10b981"),
        "run_hover": ("#047857", "#059669"),
    },
    "Dark-Blue": {
        "primary": ("#1e40af", "#2563eb"),
        "hover": ("#1e3a8a", "#1d4ed8"),
        "accent": ("#1d4ed8", "#60a5fa"),
        "run": ("#0d9488", "#14b8a6"),
        "run_hover": ("#0f766e", "#0d9488"),
    },
    "Purple": {
        "primary": ("#7c3aed", "#8b5cf6"),
        "hover": ("#6d28d9", "#7c3aed"),
        "accent": ("#7c3aed", "#a78bfa"),
        "run": ("#10b981", "#10b981"),
        "run_hover": ("#059669", "#059669"),
    },
    "Amber": {
        "primary": ("#d97706", "#f59e0b"),
        "hover": ("#b45309", "#d97706"),
        "accent": ("#d97706", "#fbbf24"),
        "run": ("#10b981", "#10b981"),
        "run_hover": ("#059669", "#059669"),
    },
}

# Supported true fixed-width monospace fonts (Courier New is universally standard on Windows)
MONO_FONTS = ["Courier New", "Consolas", "Courier", "Lucida Console"]


def get_strategies_from_folder() -> list[str]:
    """Scans user_data/strategies directory and returns ONLY physically present strategy files."""
    # Resolve relative to script location to ensure correct path regardless of current working directory
    base_dir = Path(__file__).resolve().parent
    strat_dir = base_dir / "user_data" / "strategies"
    if not strat_dir.exists():
        strat_dir = Path("user_data/strategies")
    if not strat_dir.exists():
        return ["AdxDmiRobustV2", "AdxDmiOnlyStrategy"]

    found = [
        f.stem for f in strat_dir.glob("*.py")
        if not f.name.startswith("__") and not f.name.startswith(".")
    ]
    return sorted(found) if found else ["AdxDmiRobustV2"]


class FreqtradeGuiRunner(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Freqtrade Strategy GUI Runner")
        self.geometry("1140x820")
        self.minsize(960, 680)

        self.tester = RunTest()

        # Appearance & True Monospace Font State
        self.current_font_family = "Courier New"
        self.current_font_size = 11
        self.current_theme = "Blue"
        self.log_font = ctk.CTkFont(family=self.current_font_family, size=self.current_font_size)

        # Cache of logs for current run
        self.short_log_content = ""
        self.long_log_content = ""
        self.raw_console_content = (
            "[INFO] Freqtrade GUI Runner Initialized.\n"
            "[INFO] Monospace font configured for accurate ASCII table alignment.\n"
            "Select a strategy and click 'Run Backtest Matrix'.\n"
        )

        self.timeranges = [
            ("5 Years (2021-2026)", self.tester.TR_5Y),
            ("3 Years (2023-2026)", self.tester.TR_3Y),
            ("2 Years (2024-2026)", self.tester.TR_2Y),
            ("1 Year (2025-2026)", self.tester.TR_1Y),
            ("6 Months (2025-2026)", self.tester.TR_6M),
            ("Latest (20250325-2026)", self.tester.TR_LY),
        ]

        self._build_ui()
        self._load_existing_logs(self.strat_menu.get())

    def _build_ui(self):
        # 1. Header Frame
        header_frame = ctk.CTkFrame(self, fg_color=("#e2e8f0", "#0f172a"), corner_radius=0)
        header_frame.pack(fill="x", padx=0, pady=0)

        self.title_label = ctk.CTkLabel(
            header_frame,
            text="⚡ Freqtrade Backtest GUI",
            font=("Arial", 18, "bold"),
            text_color=THEME_PALETTES["Blue"]["accent"],
        )
        self.title_label.pack(side="left", padx=20, pady=12)

        # Right Header: Theme & Dark/Light Mode Controls
        theme_controls = ctk.CTkFrame(header_frame, fg_color="transparent")
        theme_controls.pack(side="right", padx=16, pady=8)

        ctk.CTkLabel(theme_controls, text="Mode:", font=("Arial", 11, "bold")).pack(side="left", padx=(0, 4))
        self.mode_toggle = ctk.CTkSegmentedButton(
            theme_controls,
            values=["Dark", "Light"],
            width=110,
            command=self._on_appearance_mode_change,
        )
        self.mode_toggle.set("Dark")
        self.mode_toggle.pack(side="left", padx=(0, 14))

        ctk.CTkLabel(theme_controls, text="Theme:", font=("Arial", 11, "bold")).pack(side="left", padx=(0, 4))
        self.theme_menu = ctk.CTkOptionMenu(
            theme_controls,
            values=list(THEME_PALETTES.keys()),
            width=105,
            command=self._on_theme_color_change,
        )
        self.theme_menu.set("Blue")
        self.theme_menu.pack(side="left")

        # 2. Control Panel
        control_frame = ctk.CTkFrame(self, fg_color=("#cbd5e1", "#1e293b"), corner_radius=10)
        control_frame.pack(fill="x", padx=16, pady=10)

        # Row 1: Strategy & Timerange
        row1 = ctk.CTkFrame(control_frame, fg_color="transparent")
        row1.pack(fill="x", padx=12, pady=10)

        ctk.CTkLabel(row1, text="Strategy:", font=("Arial", 13, "bold")).pack(side="left", padx=(0, 8))

        # Dynamically load ONLY strategies present in user_data/strategies/
        available_strats = get_strategies_from_folder()
        self.strat_menu = ctk.CTkOptionMenu(
            row1,
            values=available_strats,
            width=230,
            command=self._on_strategy_change,
        )
        default_strat = "AdxDmiRobustV2" if "AdxDmiRobustV2" in available_strats else available_strats[0]
        self.strat_menu.set(default_strat)
        self.strat_menu.pack(side="left", padx=(0, 8))

        self.refresh_btn = ctk.CTkButton(
            row1,
            text="🔄 Refresh",
            width=80,
            fg_color=("#94a3b8", "#334155"),
            hover_color=("#64748b", "#475569"),
            command=self._refresh_strategies,
        )
        self.refresh_btn.pack(side="left", padx=(0, 18))

        ctk.CTkLabel(row1, text="Timerange:", font=("Arial", 13, "bold")).pack(side="left", padx=(0, 8))
        self.tr_menu = ctk.CTkOptionMenu(
            row1,
            values=[label for label, _ in self.timeranges],
            width=210,
        )
        self.tr_menu.set(self.timeranges[0][0])
        self.tr_menu.pack(side="left", padx=(0, 18))

        self.download_var = ctk.BooleanVar(value=False)
        self.download_cb = ctk.CTkCheckBox(row1, text="Download Data First", variable=self.download_var)
        self.download_cb.pack(side="left")

        # Row 2: Config Info Display
        self.info_label = ctk.CTkLabel(
            control_frame,
            text="",
            font=("Consolas", 11),
            text_color=("#059669", "#34d399"),
            justify="left",
        )
        self.info_label.pack(fill="x", padx=12, pady=(0, 8))
        self._on_strategy_change(self.strat_menu.get())

        # Row 3: Action Buttons
        btn_row = ctk.CTkFrame(control_frame, fg_color="transparent")
        btn_row.pack(fill="x", padx=12, pady=(0, 10))

        self.run_btn = ctk.CTkButton(
            btn_row,
            text="🚀 Run Backtest Matrix",
            font=("Arial", 14, "bold"),
            fg_color="#10b981",
            hover_color="#059669",
            height=38,
            command=self._start_run_thread,
        )
        self.run_btn.pack(side="left", padx=(0, 12))

        self.plot_btn = ctk.CTkButton(
            btn_row,
            text="📈 Plot Dataframe (Brave)",
            font=("Arial", 13),
            fg_color="#3b82f6",
            hover_color="#2563eb",
            height=38,
            command=self._plot_current,
        )
        self.plot_btn.pack(side="left", padx=(0, 12))

        self.open_logs_btn = ctk.CTkButton(
            btn_row,
            text="📂 Open Logs Folder",
            font=("Arial", 12),
            fg_color=("#64748b", "#475569"),
            hover_color=("#475569", "#64748b"),
            height=38,
            command=self._open_logs_folder,
        )
        self.open_logs_btn.pack(side="left", padx=(0, 12))

        self.status_label = ctk.CTkLabel(
            btn_row,
            text="Ready",
            font=("Arial", 12),
            text_color=("#475569", "#94a3b8"),
        )
        self.status_label.pack(side="left", padx=10)

        # 3. Output Terminal & Results Area
        output_frame = ctk.CTkFrame(self, fg_color=("#f1f5f9", "#090d16"), corner_radius=10)
        output_frame.pack(fill="both", expand=True, padx=16, pady=(0, 16))

        # Log View Switcher Bar + Font Family & Size Selectors
        top_output_bar = ctk.CTkFrame(output_frame, fg_color="transparent")
        top_output_bar.pack(fill="x", padx=12, pady=(8, 4))

        ctk.CTkLabel(
            top_output_bar,
            text="Logs:",
            font=("Arial", 12, "bold"),
            text_color=("#334155", "#cbd5e1"),
        ).pack(side="left", padx=(0, 8))

        # Segmented button to switch between Short Log, Long Log, and Docker Console
        self.log_mode_segmented = ctk.CTkSegmentedButton(
            top_output_bar,
            values=["Short Summary (Table)", "Detailed Long Log", "Docker Console"],
            command=self._on_log_mode_change,
        )
        self.log_mode_segmented.set("Docker Console")
        self.log_mode_segmented.pack(side="left")

        # Right side of bar: Font Family, Font Size, and Copy Controls
        font_bar = ctk.CTkFrame(top_output_bar, fg_color="transparent")
        font_bar.pack(side="right")

        # Font Family Picker
        ctk.CTkLabel(font_bar, text="Font:", font=("Arial", 11, "bold")).pack(side="left", padx=(0, 4))
        self.font_family_menu = ctk.CTkOptionMenu(
            font_bar,
            values=MONO_FONTS,
            width=115,
            command=self._on_font_family_change,
        )
        self.font_family_menu.set(self.current_font_family)
        self.font_family_menu.pack(side="left", padx=(0, 10))

        # Font Size Picker
        ctk.CTkLabel(font_bar, text="Size:", font=("Arial", 11, "bold")).pack(side="left", padx=(0, 4))
        self.font_size_menu = ctk.CTkOptionMenu(
            font_bar,
            values=["9", "10", "11", "12", "13", "14", "16", "18"],
            width=65,
            command=self._on_font_size_change,
        )
        self.font_size_menu.set(str(self.current_font_size))
        self.font_size_menu.pack(side="left", padx=(0, 8))

        # Copy Log Button
        self.copy_btn = ctk.CTkButton(
            font_bar,
            text="📋 Copy",
            width=65,
            fg_color=("#94a3b8", "#334155"),
            hover_color=("#64748b", "#475569"),
            command=self._copy_log_to_clipboard,
        )
        self.copy_btn.pack(side="left")

        # Textbox with strict monospace font (Courier New / Consolas) to keep ASCII table alignment perfect
        self.textbox = ctk.CTkTextbox(
            output_frame,
            font=self.log_font,
            text_color=("#0f172a", "#f1f5f9"),
            fg_color=("#ffffff", "#020617"),
            wrap="none",
        )
        self.textbox.pack(fill="both", expand=True, padx=8, pady=(4, 8))
        self._apply_strict_monospace_font()
        self.textbox.insert("end", self.raw_console_content)

    def _apply_strict_monospace_font(self):
        """Applies true monospace font to CTkTextbox and underlying Tk Text widget for pixel-perfect ASCII alignment."""
        try:
            self.log_font = ctk.CTkFont(family=self.current_font_family, size=self.current_font_size)
            self.textbox.configure(font=self.log_font)
            # Direct configuration on internal tkinter.Text guarantees exact monospace cell pitch
            if hasattr(self.textbox, "_textbox"):
                self.textbox._textbox.configure(font=(self.current_font_family, self.current_font_size))
        except Exception as exc:
            print(f"[FONT CONFIG ERROR] {exc}")

    def _on_appearance_mode_change(self, mode: str):
        ctk.set_appearance_mode(mode.lower())

    def _on_theme_color_change(self, theme: str):
        self.current_theme = theme
        palette = THEME_PALETTES.get(theme, THEME_PALETTES["Blue"])

        # Dynamically recolor key interactive widgets for instantaneous visual feedback
        self.title_label.configure(text_color=palette["accent"])
        self.plot_btn.configure(fg_color=palette["primary"], hover_color=palette["hover"])
        self.strat_menu.configure(fg_color=palette["primary"], button_color=palette["primary"], button_hover_color=palette["hover"])
        self.tr_menu.configure(fg_color=palette["primary"], button_color=palette["primary"], button_hover_color=palette["hover"])
        self.theme_menu.configure(fg_color=palette["primary"], button_color=palette["primary"], button_hover_color=palette["hover"])
        self.font_family_menu.configure(fg_color=palette["primary"], button_color=palette["primary"], button_hover_color=palette["hover"])
        self.font_size_menu.configure(fg_color=palette["primary"], button_color=palette["primary"], button_hover_color=palette["hover"])

        theme_map = {"Blue": "blue", "Green": "green", "Dark-Blue": "dark-blue"}
        if theme in theme_map:
            ctk.set_default_color_theme(theme_map[theme])

    def _on_font_family_change(self, family: str):
        self.current_font_family = family
        self._apply_strict_monospace_font()

    def _on_font_size_change(self, size_str: str):
        try:
            self.current_font_size = int(size_str)
            self._apply_strict_monospace_font()
        except Exception as exc:
            print(f"[FONT SIZE ERROR] {exc}")

    def _copy_log_to_clipboard(self):
        try:
            content = self.textbox.get("1.0", "end-1c")
            self.clipboard_clear()
            self.clipboard_append(content)
            self.status_label.configure(text="Copied to clipboard!", text_color="#34d399")
            self.after(2500, lambda: self.status_label.configure(text="Ready", text_color=("#475569", "#94a3b8")))
        except Exception as exc:
            print(f"[COPY ERROR] {exc}")

    def _load_existing_logs(self, strategy: str):
        """Preloads existing short and long log files if already generated for this strategy."""
        try:
            short_logs = sorted(Path(".").glob(f"short.test.result.{strategy}.*.log"), key=os.path.getmtime)
            if short_logs:
                self.short_log_content = short_logs[-1].read_text(encoding="utf-8")

            long_logs = sorted(Path(".").glob(f"long.test.result.{strategy}.*.log"), key=os.path.getmtime)
            if long_logs:
                self.long_log_content = long_logs[-1].read_text(encoding="utf-8")
        except Exception:
            pass

    def _refresh_strategies(self):
        strats = get_strategies_from_folder()
        self.strat_menu.configure(values=strats)
        cur = self.strat_menu.get()
        if cur not in strats:
            self.strat_menu.set(strats[0])
            self._on_strategy_change(strats[0])

    def _on_strategy_change(self, strategy: str):
        cfg = self.tester._get_strategy_config(strategy)
        pairs = ", ".join(cfg.get("pairs", []))
        timeframes = ", ".join(cfg.get("TT", []))
        mop = ", ".join(str(x) for x in cfg.get("MOP", []))
        self.info_label.configure(
            text=f"Strategy: {strategy} | Timeframes: [{timeframes}] | Max Open Trades: [{mop}] | Pairs: {pairs}"
        )
        self._load_existing_logs(strategy)

    def _on_log_mode_change(self, mode: str):
        self.textbox.delete("1.0", "end")
        if mode == "Short Summary (Table)":
            if self.short_log_content:
                self.textbox.insert("end", self.short_log_content)
            else:
                self.textbox.insert("end", "[INFO] No short log result yet. Run a backtest first.\n")
        elif mode == "Detailed Long Log":
            if self.long_log_content:
                self.textbox.insert("end", self.long_log_content)
            else:
                self.textbox.insert("end", "[INFO] No long log result yet. Run a backtest first.\n")
        else:
            self.textbox.insert("end", self.raw_console_content)

    def _set_ui_state(self, enabled: bool):
        """Enables or disables all interactive controls during execution to prevent concurrent tampering."""
        state = "normal" if enabled else "disabled"
        self.run_btn.configure(state=state)
        self.strat_menu.configure(state=state)
        self.refresh_btn.configure(state=state)
        self.tr_menu.configure(state=state)
        self.download_cb.configure(state=state)
        self.plot_btn.configure(state=state)
        self.open_logs_btn.configure(state=state)
        self.mode_toggle.configure(state=state)
        self.theme_menu.configure(state=state)
        self.font_family_menu.configure(state=state)
        self.font_size_menu.configure(state=state)
        self.copy_btn.configure(state=state)

    def _start_run_thread(self):
        strategy = self.strat_menu.get()
        selected_tr_label = self.tr_menu.get()
        timerange = next(tr for lbl, tr in self.timeranges if lbl == selected_tr_label)
        download = self.download_var.get()

        # Disable all UI controls while test is running
        self._set_ui_state(False)
        self.status_label.configure(text=f"Running {strategy}...", text_color="#fbbf24")

        start_msg = (
            f"\n=======================================================\n"
            f"[START] Running backtests for {strategy} on {timerange}\n"
            f"=======================================================\n"
        )
        self.raw_console_content += start_msg
        self.log_mode_segmented.set("Docker Console")
        self.textbox.delete("1.0", "end")
        self.textbox.insert("end", self.raw_console_content)

        thread = threading.Thread(
            target=self._run_task,
            args=(strategy, timerange, download),
            daemon=True,
        )
        thread.start()

    def _run_task(self, strategy: str, timerange: str, download: bool):
        try:
            self.tester.timerange = timerange
            results = self.tester.runtest(strategy, download=download, test=True)

            # Read short log if exists
            short_logs = sorted(Path(".").glob(f"short.test.result.{strategy}.*.log"), key=os.path.getmtime)
            if short_logs:
                self.short_log_content = short_logs[-1].read_text(encoding="utf-8")

            # Read long log if exists
            long_logs = sorted(Path(".").glob(f"long.test.result.{strategy}.*.log"), key=os.path.getmtime)
            if long_logs:
                self.long_log_content = long_logs[-1].read_text(encoding="utf-8")

            done_msg = f"\n[SUCCESS] Completed {strategy} test run!\n"
            self.raw_console_content += done_msg

            # Switch view to short summary table automatically
            self.log_mode_segmented.set("Short Summary (Table)")
            self.textbox.delete("1.0", "end")
            self.textbox.insert("end", self.short_log_content or self.raw_console_content)

            self.status_label.configure(text="Finished Successfully", text_color="#34d399")

            # Safe Tonification with master reference to avoid DPI scaling tracker crash
            Tonification("Freqtrade Backtest", f"Completed {strategy} test!", 3000, master=self)

        except Exception as exc:
            err_msg = f"\n[ERROR] {exc}\n"
            self.raw_console_content += err_msg
            self.textbox.insert("end", err_msg)
            self.status_label.configure(text="Failed with errors", text_color="#f87171")
        finally:
            # Re-enable all UI controls when test completes or errors
            self._set_ui_state(True)

    def _plot_current(self):
        try:
            strategy = self.strat_menu.get()
            self.tester.current_strategy = strategy
            self.tester.current_config_file = f"user_data/{strategy}_test_config.json"
            self.tester.plot_data()
        except Exception as exc:
            self.textbox.insert("end", f"\n[PLOT ERROR] {exc}\n")

    def _open_logs_folder(self):
        try:
            folder_path = os.path.abspath(".")
            if sys.platform == "win32":
                os.startfile(folder_path)
            elif sys.platform == "darwin":
                subprocess.Popen(["open", folder_path])
            else:
                subprocess.Popen(["xdg-open", folder_path])
        except Exception as exc:
            self.textbox.insert("end", f"\n[FOLDER ERROR] {exc}\n")


if __name__ == "__main__":
    app = FreqtradeGuiRunner()
    app.mainloop()
