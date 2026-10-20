#!/usr/bin/env python3
"""
Freqtrade Strategy GUI Runner
Multi-threaded Docker backtest runner with real-time log inspector,
configurable appearance modes, fixed-width monospace font rendering for ASCII tables,
and an embedded Test Database & Strategy Code History Browser Tab directly in the main window.
"""
from __future__ import annotations

import os
import sys
import threading
import subprocess
from pathlib import Path
from run_test import RunTest, Tonification, HAS_CTK
import test_db

if not HAS_CTK:
    print("[ERROR] customtkinter is required. Please install it via: pip install customtkinter")
    sys.exit(1)

import customtkinter as ctk

# Color palettes for dynamic theme switching
THEME_PALETTES = {
    "Blue": {
        "primary": "#3b82f6",
        "hover": "#2563eb",
        "accent": "#60a5fa",
        "bg_subtle": "#1e293b",
    },
    "Green": {
        "primary": "#10b981",
        "hover": "#059669",
        "accent": "#34d399",
        "bg_subtle": "#064e3b",
    },
    "Dark-Blue": {
        "primary": "#1e40af",
        "hover": "#1d4ed8",
        "accent": "#38bdf8",
        "bg_subtle": "#0f172a",
    },
}

# Monospace fonts designed for pixel-perfect ASCII table rendering
MONO_FONTS = ["Courier New", "Consolas", "Courier"]


def get_strategies_from_folder() -> list[str]:
    """Scans user_data/strategies for .py files and returns their exact strategy names without .py."""
    strat_dir = Path("user_data/strategies")
    if not strat_dir.exists():
        return ["AdxDmiRobustV2"]

    found = []
    for f in sorted(strat_dir.glob("*.py")):
        if f.name.startswith("__") or f.name.endswith(".pyc"):
            continue
        found.append(f.stem)

    if not found:
        found = ["AdxDmiRobustV2"]
    return found


class FreqtradeGuiRunner(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Freqtrade Strategy Backtest Suite")
        self.geometry("1240x860")
        self.minsize(1020, 700)

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
            "Select a strategy and click 'Run Backtest Matrix' or switch to the Test Database tab.\n"
        )

        self.timeranges = [
            ("Last 5 Years (until 10.10.2026)", self.tester.TR_LAST_5Y),
            ("Last 4 Years (until 10.10.2026)", self.tester.TR_LAST_4Y),
            ("Last 3 Years (until 10.10.2026)", self.tester.TR_LAST_3Y),
            ("Last 2 Years (until 10.10.2026)", self.tester.TR_LAST_2Y),
            ("Last 1 Year (until 10.10.2026)", self.tester.TR_LAST_1Y),
            ("Last 6 Months (until 10.10.2026)", self.tester.TR_LAST_6M),
            ("Last 3 Months (until 10.10.2026)", self.tester.TR_LAST_3M),
            ("Last 1 Month (until 10.10.2026)", self.tester.TR_LAST_1M),
            ("Year 2025 (01.01 - 31.12)", self.tester.TR_2025),
            ("Year 2024 (01.01 - 31.12)", self.tester.TR_2024),
            ("Year 2023 (01.01 - 31.12)", self.tester.TR_2023),
            ("Year 2022 (01.01 - 31.12)", self.tester.TR_2022),
            ("Year 2021 (01.01 - 31.12)", self.tester.TR_2021),
            ("Year 2020 (01.01 - 31.12)", self.tester.TR_2020),
            ("Year 2026 YTD (until 10.10.2026)", self.tester.TR_2026_YTD),
        ]

        # Database tab state
        self.db_tests: list[dict] = []
        self.db_selected_test: dict | None = None
        self.db_fav_var = ctk.BooleanVar(value=False)

        self._build_ui()
        self._load_existing_logs(self.strat_menu.get())
        self._db_load_tests()

    def _build_ui(self):
        # 1. Top Header Frame (Global for whole window)
        header_frame = ctk.CTkFrame(self, fg_color=("#e2e8f0", "#0f172a"), corner_radius=0)
        header_frame.pack(fill="x", padx=0, pady=0)

        self.title_label = ctk.CTkLabel(
            header_frame,
            text="⚡ Freqtrade Backtest Studio",
            font=("Arial", 18, "bold"),
            text_color=THEME_PALETTES["Blue"]["accent"],
        )
        self.title_label.pack(side="left", padx=20, pady=10)

        # Right Header: Theme & Dark/Light Mode Controls
        theme_controls = ctk.CTkFrame(header_frame, fg_color="transparent")
        theme_controls.pack(side="right", padx=16, pady=6)

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

        # 2. Main Tabview in Main Window (No separate popup window)
        self.main_tabview = ctk.CTkTabview(self, corner_radius=8)
        self.main_tabview.pack(fill="both", expand=True, padx=14, pady=(4, 10))

        self.tab_runner = self.main_tabview.add("🚀 Backtest Runner & Terminal")
        self.tab_db = self.main_tabview.add("🗄️ Test Database & History")

        # Build each tab's view
        self._build_runner_tab()
        self._build_database_tab()

    # =========================================================================
    # TAB 1: RUNNER & LOG TERMINAL
    # =========================================================================
    def _build_runner_tab(self):
        # 1. Control Panel
        control_frame = ctk.CTkFrame(self.tab_runner, fg_color=("#cbd5e1", "#1e293b"), corner_radius=8)
        control_frame.pack(fill="x", padx=6, pady=(6, 8))

        # Row 1: Strategy & Timerange
        row1 = ctk.CTkFrame(control_frame, fg_color="transparent")
        row1.pack(fill="x", padx=12, pady=(10, 6))

        ctk.CTkLabel(row1, text="Strategy:", font=("Arial", 13, "bold")).pack(side="left", padx=(0, 8))

        # Dynamically load ONLY strategies present in user_data/strategies/
        available_strats = get_strategies_from_folder()
        self.strat_menu = ctk.CTkOptionMenu(
            row1,
            values=available_strats,
            width=230,
            command=self._on_strategy_change,
        )
        default_strat = "AdxDmiLargeCap15m" if "AdxDmiLargeCap15m" in available_strats else ("AdxDmiRobustV2" if "AdxDmiRobustV2" in available_strats else available_strats[0])
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
            font=("Arial", 13, "bold"),
            fg_color="#10b981",
            hover_color="#059669",
            height=36,
            command=self._start_run_thread,
        )
        self.run_btn.pack(side="left", padx=(0, 10))

        self.plot_btn = ctk.CTkButton(
            btn_row,
            text="📈 Plot Dataframe (Brave)",
            font=("Arial", 12),
            fg_color="#3b82f6",
            hover_color="#2563eb",
            height=36,
            command=self._plot_current,
        )
        self.plot_btn.pack(side="left", padx=(0, 10))

        self.open_logs_btn = ctk.CTkButton(
            btn_row,
            text="📂 Open Logs Folder",
            font=("Arial", 12),
            fg_color=("#64748b", "#475569"),
            hover_color=("#475569", "#64748b"),
            height=36,
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

        # 2. Output Terminal & Results Area
        output_frame = ctk.CTkFrame(self.tab_runner, fg_color=("#f1f5f9", "#090d16"), corner_radius=8)
        output_frame.pack(fill="both", expand=True, padx=6, pady=(0, 6))

        # Log View Switcher Bar + Font Family & Size Selectors
        top_output_bar = ctk.CTkFrame(output_frame, fg_color="transparent")
        top_output_bar.pack(fill="x", padx=10, pady=(6, 4))

        ctk.CTkLabel(
            top_output_bar,
            text="Logs:",
            font=("Arial", 12, "bold"),
            text_color=("#334155", "#cbd5e1"),
        ).pack(side="left", padx=(0, 8))

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

        ctk.CTkLabel(font_bar, text="Font:", font=("Arial", 11, "bold")).pack(side="left", padx=(0, 4))
        self.font_family_menu = ctk.CTkOptionMenu(
            font_bar,
            values=MONO_FONTS,
            width=115,
            command=self._on_font_family_change,
        )
        self.font_family_menu.set(self.current_font_family)
        self.font_family_menu.pack(side="left", padx=(0, 10))

        ctk.CTkLabel(font_bar, text="Size:", font=("Arial", 11, "bold")).pack(side="left", padx=(0, 4))
        self.font_size_menu = ctk.CTkOptionMenu(
            font_bar,
            values=["9", "10", "11", "12", "13", "14", "16", "18"],
            width=65,
            command=self._on_font_size_change,
        )
        self.font_size_menu.set(str(self.current_font_size))
        self.font_size_menu.pack(side="left", padx=(0, 8))

        self.copy_btn = ctk.CTkButton(
            font_bar,
            text="📋 Copy",
            width=65,
            fg_color=("#94a3b8", "#334155"),
            hover_color=("#64748b", "#475569"),
            command=self._copy_log_to_clipboard,
        )
        self.copy_btn.pack(side="left")

        # Textbox with strict monospace font for ASCII table alignment
        self.textbox = ctk.CTkTextbox(
            output_frame,
            font=self.log_font,
            text_color=("#0f172a", "#f1f5f9"),
            fg_color=("#ffffff", "#020617"),
            wrap="none",
        )
        self.textbox.pack(fill="both", expand=True, padx=6, pady=(4, 6))
        self._apply_strict_monospace_font()
        self.textbox.insert("end", self.raw_console_content)

    # =========================================================================
    # TAB 2: EMBEDDED TEST DATABASE & HISTORY BROWSER
    # =========================================================================
    def _build_database_tab(self):
        # 1. Search & Filter Bar
        db_filter_bar = ctk.CTkFrame(self.tab_db, fg_color=("#cbd5e1", "#1e293b"), corner_radius=6)
        db_filter_bar.pack(fill="x", padx=6, pady=(6, 6))

        ctk.CTkLabel(db_filter_bar, text="Search:", font=("Arial", 12, "bold")).pack(side="left", padx=(10, 4), pady=6)
        self.db_search_entry = ctk.CTkEntry(
            db_filter_bar,
            placeholder_text="Filter by ID, name, notes, or tags...",
            width=240,
        )
        self.db_search_entry.pack(side="left", padx=(0, 12), pady=6)
        self.db_search_entry.bind("<KeyRelease>", lambda e: self._db_load_tests())

        ctk.CTkLabel(db_filter_bar, text="Strategy:", font=("Arial", 12, "bold")).pack(side="left", padx=(0, 4), pady=6)
        strats = ["All"] + get_strategies_from_folder()
        self.db_strat_filter_menu = ctk.CTkOptionMenu(
            db_filter_bar,
            values=strats,
            width=160,
            command=lambda val: self._db_load_tests(),
        )
        self.db_strat_filter_menu.set("All")
        self.db_strat_filter_menu.pack(side="left", padx=(0, 12), pady=6)

        self.db_fav_cb = ctk.CTkCheckBox(
            db_filter_bar,
            text="⭐ Favorites",
            variable=self.db_fav_var,
            command=self._db_load_tests,
            font=("Arial", 12),
        )
        self.db_fav_cb.pack(side="left", padx=(0, 12), pady=6)

        self.db_refresh_btn = ctk.CTkButton(
            db_filter_bar,
            text="🔄 Refresh",
            width=75,
            font=("Arial", 11, "bold"),
            fg_color=("#94a3b8", "#334155"),
            hover_color=("#64748b", "#475569"),
            command=self._db_load_tests,
        )
        self.db_refresh_btn.pack(side="left", padx=(0, 8), pady=6)

        self.db_export_btn = ctk.CTkButton(
            db_filter_bar,
            text="📤 Export JSON",
            width=90,
            font=("Arial", 11, "bold"),
            fg_color=("#64748b", "#334155"),
            hover_color=("#475569", "#475569"),
            command=self._db_export_json,
        )
        self.db_export_btn.pack(side="left", padx=(0, 8), pady=6)

        self.db_goto_runner_btn = ctk.CTkButton(
            db_filter_bar,
            text="🚀 Back to Runner",
            width=110,
            font=("Arial", 11, "bold"),
            fg_color="#10b981",
            hover_color="#059669",
            command=lambda: self.main_tabview.set("🚀 Backtest Runner & Terminal"),
        )
        self.db_goto_runner_btn.pack(side="right", padx=10, pady=6)

        self.db_count_label = ctk.CTkLabel(
            db_filter_bar,
            text="0 Tests",
            font=("Arial", 12, "bold"),
            text_color=("#475569", "#94a3b8"),
        )
        self.db_count_label.pack(side="right", padx=(0, 10), pady=6)

        # 2. Main Split View: Left List (330px) | Right Detail Tabs
        main_split = ctk.CTkFrame(self.tab_db, fg_color="transparent")
        main_split.pack(fill="both", expand=True, padx=6, pady=(0, 6))

        # Left Column: Test List
        left_col = ctk.CTkFrame(main_split, width=330, fg_color=("#e2e8f0", "#0f172a"), corner_radius=8)
        left_col.pack(side="left", fill="y", padx=(0, 6), pady=0)
        left_col.pack_propagate(False)

        list_header = ctk.CTkFrame(left_col, fg_color="transparent")
        list_header.pack(fill="x", padx=10, pady=(8, 4))
        ctk.CTkLabel(
            list_header,
            text="ARCHIVED RUNS",
            font=("Arial", 11, "bold"),
            text_color=("#64748b", "#94a3b8"),
        ).pack(side="left")

        self.db_test_list_frame = ctk.CTkScrollableFrame(left_col, fg_color="transparent")
        self.db_test_list_frame.pack(fill="both", expand=True, padx=4, pady=(0, 6))

        # Right Column: Inspector
        right_col = ctk.CTkFrame(main_split, fg_color=("#f1f5f9", "#090d16"), corner_radius=8)
        right_col.pack(side="right", fill="both", expand=True, padx=0, pady=0)

        # Inspector Header
        self.db_insp_header = ctk.CTkFrame(right_col, fg_color=("#cbd5e1", "#1e293b"), corner_radius=6)
        self.db_insp_header.pack(fill="x", padx=8, pady=(8, 4))

        self.db_selected_title_lbl = ctk.CTkLabel(
            self.db_insp_header,
            text="Select a test from the list to inspect",
            font=("Arial", 14, "bold"),
            anchor="w",
        )
        self.db_selected_title_lbl.pack(fill="x", padx=10, pady=(6, 2))

        self.db_selected_meta_lbl = ctk.CTkLabel(
            self.db_insp_header,
            text="",
            font=("Consolas", 11),
            text_color=("#059669", "#34d399"),
            anchor="w",
        )
        self.db_selected_meta_lbl.pack(fill="x", padx=10, pady=(0, 4))

        # Header Action Buttons
        insp_btn_row = ctk.CTkFrame(self.db_insp_header, fg_color="transparent")
        insp_btn_row.pack(fill="x", padx=10, pady=(0, 6))

        self.db_fav_btn = ctk.CTkButton(
            insp_btn_row,
            text="⭐ Star Test",
            width=90,
            font=("Arial", 11),
            fg_color=("#94a3b8", "#334155"),
            hover_color=("#64748b", "#475569"),
            command=self._db_toggle_fav,
        )
        self.db_fav_btn.pack(side="left", padx=(0, 8))

        self.db_copy_id_btn = ctk.CTkButton(
            insp_btn_row,
            text="📋 Copy ID",
            width=80,
            font=("Arial", 11),
            fg_color=("#94a3b8", "#334155"),
            hover_color=("#64748b", "#475569"),
            command=self._db_copy_test_id,
        )
        self.db_copy_id_btn.pack(side="left", padx=(0, 8))

        self.db_del_btn = ctk.CTkButton(
            insp_btn_row,
            text="🗑️ Delete Test",
            width=95,
            font=("Arial", 11),
            fg_color=("#dc2626", "#b91c1c"),
            hover_color=("#991b1b", "#991b1b"),
            command=self._db_delete_test,
        )
        self.db_del_btn.pack(side="right")

        # Sub Tabview for Right Column
        self.db_sub_tabview = ctk.CTkTabview(right_col)
        self.db_sub_tabview.pack(fill="both", expand=True, padx=8, pady=(0, 8))

        tab_short = self.db_sub_tabview.add("📊 Short Result")
        tab_long = self.db_sub_tabview.add("📜 Long Log")
        tab_code = self.db_sub_tabview.add("🧠 Algorithm Code")
        tab_cfg = self.db_sub_tabview.add("⚙️ Config JSON")
        tab_notes = self.db_sub_tabview.add("📝 Notes & Tags")

        # Tab 1: Short Result
        short_bar = ctk.CTkFrame(tab_short, fg_color="transparent")
        short_bar.pack(fill="x", padx=4, pady=4)
        ctk.CTkLabel(
            short_bar,
            text="Summary Comparison Table (Monospace Courier New):",
            font=("Arial", 11, "bold"),
        ).pack(side="left")
        ctk.CTkButton(
            short_bar,
            text="📋 Copy Table",
            width=85,
            command=lambda: self._copy_widget_content(self.db_short_box),
        ).pack(side="right")

        self.db_short_box = ctk.CTkTextbox(
            tab_short,
            font=ctk.CTkFont(family="Courier New", size=11),
            wrap="none",
        )
        self.db_short_box.pack(fill="both", expand=True, padx=4, pady=4)
        if hasattr(self.db_short_box, "_textbox"):
            self.db_short_box._textbox.configure(font=("Courier New", 11))

        # Tab 2: Long Log
        long_bar = ctk.CTkFrame(tab_long, fg_color="transparent")
        long_bar.pack(fill="x", padx=4, pady=4)
        ctk.CTkLabel(
            long_bar,
            text="Full Backtest Console & Container Output:",
            font=("Arial", 11, "bold"),
        ).pack(side="left")
        ctk.CTkButton(
            long_bar,
            text="📋 Copy Log",
            width=85,
            command=lambda: self._copy_widget_content(self.db_long_box),
        ).pack(side="right")

        self.db_long_box = ctk.CTkTextbox(
            tab_long,
            font=ctk.CTkFont(family="Courier New", size=11),
            wrap="none",
        )
        self.db_long_box.pack(fill="both", expand=True, padx=4, pady=4)
        if hasattr(self.db_long_box, "_textbox"):
            self.db_long_box._textbox.configure(font=("Courier New", 11))

        # Tab 3: Algorithm Code
        code_bar = ctk.CTkFrame(tab_code, fg_color="transparent")
        code_bar.pack(fill="x", padx=4, pady=4)
        ctk.CTkLabel(
            code_bar,
            text="Python Strategy Code (Preserved at Test Execution Time):",
            font=("Arial", 11, "bold"),
        ).pack(side="left")

        ctk.CTkButton(
            code_bar,
            text="💾 Restore to File",
            width=110,
            fg_color=("#059669", "#10b981"),
            hover_color=("#047857", "#059669"),
            command=self._db_restore_code,
        ).pack(side="right", padx=(8, 0))

        ctk.CTkButton(
            code_bar,
            text="📋 Copy Code",
            width=85,
            command=lambda: self._copy_widget_content(self.db_code_box),
        ).pack(side="right")

        self.db_code_box = ctk.CTkTextbox(
            tab_code,
            font=ctk.CTkFont(family="Consolas", size=11),
            wrap="none",
        )
        self.db_code_box.pack(fill="both", expand=True, padx=4, pady=4)

        # Tab 4: Config JSON
        cfg_bar = ctk.CTkFrame(tab_cfg, fg_color="transparent")
        cfg_bar.pack(fill="x", padx=4, pady=4)
        ctk.CTkLabel(
            cfg_bar,
            text="Configuration JSON (Pairs, Stoploss, ROI, Stake):",
            font=("Arial", 11, "bold"),
        ).pack(side="left")
        ctk.CTkButton(
            cfg_bar,
            text="📋 Copy Config",
            width=85,
            command=lambda: self._copy_widget_content(self.db_cfg_box),
        ).pack(side="right")

        self.db_cfg_box = ctk.CTkTextbox(
            tab_cfg,
            font=ctk.CTkFont(family="Consolas", size=11),
            wrap="none",
        )
        self.db_cfg_box.pack(fill="both", expand=True, padx=4, pady=4)

        # Tab 5: Notes & Tags
        notes_top = ctk.CTkFrame(tab_notes, fg_color="transparent")
        notes_top.pack(fill="x", padx=6, pady=4)
        ctk.CTkLabel(notes_top, text="Tags (comma separated):", font=("Arial", 11, "bold")).pack(side="left", padx=(0, 6))
        self.db_tags_entry = ctk.CTkEntry(
            notes_top,
            placeholder_text="e.g. Production, Bull-Run, Low-DD",
            width=320,
        )
        self.db_tags_entry.pack(side="left", padx=(0, 10))

        ctk.CTkButton(
            notes_top,
            text="💾 Save Notes & Tags",
            width=135,
            fg_color=("#059669", "#10b981"),
            hover_color=("#047857", "#059669"),
            command=self._db_save_notes,
        ).pack(side="right")

        ctk.CTkLabel(tab_notes, text="Notes & Observations:", font=("Arial", 11, "bold")).pack(anchor="w", padx=6, pady=(4, 2))
        self.db_notes_box = ctk.CTkTextbox(tab_notes, font=("Arial", 12), wrap="word")
        self.db_notes_box.pack(fill="both", expand=True, padx=6, pady=(2, 6))

    # =========================================================================
    # DATABASE TAB METHODS
    # =========================================================================
    def _switch_to_db_tab(self):
        self.main_tabview.set("🗄️ Test Database & History")
        self._db_load_tests()

    def _db_load_tests(self):
        query = self.db_search_entry.get().strip() if hasattr(self, "db_search_entry") else ""
        strat = self.db_strat_filter_menu.get() if hasattr(self, "db_strat_filter_menu") else "All"
        fav = self.db_fav_var.get() if hasattr(self, "db_fav_var") else False

        self.db_tests = test_db.list_tests(
            strategy=strat if strat != "All" else None,
            search_query=query if query else None,
            favorites_only=fav,
            limit=100,
        )

        if hasattr(self, "db_count_label"):
            self.db_count_label.configure(
                text=f"{len(self.db_tests)} Test{'s' if len(self.db_tests) != 1 else ''}"
            )

        # Clear existing card list
        for child in self.db_test_list_frame.winfo_children():
            child.destroy()

        if not self.db_tests:
            empty_lbl = ctk.CTkLabel(
                self.db_test_list_frame,
                text="No tests found matching filters.\nRun backtests to archive them here.",
                text_color=("#64748b", "#94a3b8"),
                font=("Arial", 11),
                justify="center",
            )
            empty_lbl.pack(pady=40, padx=10)
            self._db_clear_inspector()
            return

        for t in self.db_tests:
            self._db_render_test_card(t)

        # Select first test by default if none selected or if previous selected not in new list
        if not self.db_selected_test or not any(x["id"] == self.db_selected_test["id"] for x in self.db_tests):
            self._db_select_test(self.db_tests[0])

    def _db_render_test_card(self, t: dict):
        card = ctk.CTkFrame(self.db_test_list_frame, fg_color=("#cbd5e1", "#1e293b"), corner_radius=6)
        card.pack(fill="x", padx=4, pady=3)

        top_line = ctk.CTkFrame(card, fg_color="transparent")
        top_line.pack(fill="x", padx=8, pady=(6, 2))

        star = "⭐ " if t.get("favorite") else ""
        id_lbl = ctk.CTkLabel(
            top_line,
            text=f"{star}{t['id']}",
            font=("Arial", 11, "bold"),
            text_color=("#1e293b", "#f8fafc"),
            anchor="w",
        )
        id_lbl.pack(side="left")

        # Profit badge
        profit = t.get("profit_pct", 0.0)
        p_color = "#10b981" if profit >= 0 else "#ef4444"
        p_sign = "+" if profit > 0 else ""
        profit_lbl = ctk.CTkLabel(
            top_line,
            text=f"{p_sign}{profit:.1f}%",
            font=("Arial", 11, "bold"),
            text_color=p_color,
        )
        profit_lbl.pack(side="right")

        # Mid line: Strategy and timeframe
        mid_line = ctk.CTkLabel(
            card,
            text=f"{t.get('strategy')} · {t.get('timeframe') or '1h'}",
            font=("Arial", 10),
            text_color=("#475569", "#94a3b8"),
            anchor="w",
        )
        mid_line.pack(fill="x", padx=8, pady=(0, 2))

        # Bottom line: trades and date
        bot_line = ctk.CTkLabel(
            card,
            text=f"{t.get('total_trades', 0)} trades · {t.get('timestamp', '')[:16]}",
            font=("Consolas", 9),
            text_color=("#64748b", "#64748b"),
            anchor="w",
        )
        bot_line.pack(fill="x", padx=8, pady=(0, 6))

        # Click event to select
        def make_click_handler(test_dict):
            return lambda event=None: self._db_select_test(test_dict)

        handler = make_click_handler(t)
        card.bind("<Button-1>", handler)
        id_lbl.bind("<Button-1>", handler)
        profit_lbl.bind("<Button-1>", handler)
        mid_line.bind("<Button-1>", handler)
        bot_line.bind("<Button-1>", handler)

    def _db_select_test(self, t: dict):
        self.db_selected_test = t
        profit = t.get("profit_pct", 0.0)
        p_sign = "+" if profit > 0 else ""
        dd = t.get("drawdown_pct", 0.0)
        win = t.get("win_rate_pct", 0.0)
        trades = t.get("total_trades", 0)

        star_prefix = "⭐ " if t.get("favorite") else ""
        self.db_selected_title_lbl.configure(
            text=f"{star_prefix}[{t['id']}] {t.get('testname', 'Backtest')}"
        )
        self.db_selected_meta_lbl.configure(
            text=(
                f"Strategy: {t.get('strategy')} | Profit: {p_sign}{profit:.2f}% | "
                f"Drawdown: {dd:.2f}% | Win Rate: {win:.1f}% | Trades: {trades} | "
                f"Date: {t.get('timestamp')}"
            )
        )

        self.db_fav_btn.configure(text="★ Unstar" if t.get("favorite") else "⭐ Star Test")

        # Tab 1: Short Result
        self.db_short_box.delete("1.0", "end")
        self.db_short_box.insert("end", t.get("short_result") or "[No short summary stored for this test]")

        # Tab 2: Long Result
        self.db_long_box.delete("1.0", "end")
        self.db_long_box.insert("end", t.get("long_result") or "[No detailed long log stored for this test]")

        # Tab 3: Full Algorithm Code
        self.db_code_box.delete("1.0", "end")
        self.db_code_box.insert("end", t.get("full_algorithm_code") or "# No strategy code recorded for this test")

        # Tab 4: Full Config
        self.db_cfg_box.delete("1.0", "end")
        self.db_cfg_box.insert("end", t.get("full_config") or "{}")

        # Tab 5: Notes & Tags
        tags = t.get("tags") or []
        self.db_tags_entry.delete(0, "end")
        self.db_tags_entry.insert(0, ", ".join(tags) if isinstance(tags, list) else str(tags))

        self.db_notes_box.delete("1.0", "end")
        self.db_notes_box.insert("end", t.get("notes") or "")

    def _db_clear_inspector(self):
        self.db_selected_test = None
        self.db_selected_title_lbl.configure(text="No test selected")
        self.db_selected_meta_lbl.configure(text="")
        self.db_short_box.delete("1.0", "end")
        self.db_long_box.delete("1.0", "end")
        self.db_code_box.delete("1.0", "end")
        self.db_cfg_box.delete("1.0", "end")
        self.db_notes_box.delete("1.0", "end")
        self.db_tags_entry.delete(0, "end")

    def _db_copy_test_id(self):
        if self.db_selected_test:
            self.clipboard_clear()
            self.clipboard_append(self.db_selected_test["id"])

    def _db_toggle_fav(self):
        if not self.db_selected_test:
            return
        tid = self.db_selected_test["id"]
        new_fav = test_db.toggle_favorite(tid)
        self.db_selected_test["favorite"] = new_fav
        self.db_fav_btn.configure(text="★ Unstar" if new_fav else "⭐ Star Test")
        self._db_load_tests()

    def _db_save_notes(self):
        if not self.db_selected_test:
            return
        tid = self.db_selected_test["id"]
        notes = self.db_notes_box.get("1.0", "end-1c").strip()
        tags_raw = self.db_tags_entry.get().strip()
        tags = [t.strip() for t in tags_raw.split(",") if t.strip()]

        test_db.update_notes(tid, notes=notes, tags=tags)
        self.db_selected_test["notes"] = notes
        self.db_selected_test["tags"] = tags
        self._db_load_tests()

    def _db_delete_test(self):
        if not self.db_selected_test:
            return
        tid = self.db_selected_test["id"]
        test_db.delete_test(tid)
        self._db_load_tests()

    def _db_restore_code(self):
        if not self.db_selected_test:
            return
        code = self.db_code_box.get("1.0", "end-1c").strip()
        if not code:
            return
        strat = self.db_selected_test.get("strategy")
        if not strat:
            return
        dest = Path(f"user_data/strategies/{strat}.py")
        dest.write_text(code, encoding="utf-8")
        self._refresh_strategies()

    def _db_export_json(self):
        export_path = Path("user_data/backtests_export.json")
        count = test_db.export_to_json(export_path)
        print(f"[DATABASE] Exported {count} tests to {export_path}")

    def _copy_widget_content(self, text_widget: ctk.CTkTextbox):
        content = text_widget.get("1.0", "end-1c")
        self.clipboard_clear()
        self.clipboard_append(content)

    # =========================================================================
    # RUNNER TAB LOGIC & CONTROLS
    # =========================================================================
    def _apply_strict_monospace_font(self):
        """Applies true monospace font to CTkTextbox and underlying Tk Text widget for pixel-perfect ASCII alignment."""
        try:
            self.log_font = ctk.CTkFont(family=self.current_font_family, size=self.current_font_size)
            self.textbox.configure(font=self.log_font)
            if hasattr(self.textbox, "_textbox"):
                self.textbox._textbox.configure(font=(self.current_font_family, self.current_font_size))
        except Exception as exc:
            print(f"[FONT CONFIG ERROR] {exc}")

    def _on_appearance_mode_change(self, mode: str):
        ctk.set_appearance_mode(mode.lower())

    def _on_theme_color_change(self, theme: str):
        self.current_theme = theme
        palette = THEME_PALETTES.get(theme, THEME_PALETTES["Blue"])

        # Dynamically recolor key interactive widgets
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

        if hasattr(self, "db_strat_filter_menu"):
            self.db_strat_filter_menu.configure(values=["All"] + strats)

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
        """Enables or disables backtest run controls during execution, keeping theme and font styling active."""
        state = "normal" if enabled else "disabled"
        self.run_btn.configure(state=state)
        self.strat_menu.configure(state=state)
        self.refresh_btn.configure(state=state)
        self.tr_menu.configure(state=state)
        self.download_cb.configure(state=state)
        self.plot_btn.configure(state=state)
        self.open_logs_btn.configure(state=state)
        self.copy_btn.configure(state=state)
        # Note: Mode toggle, theme menu, font family, and font size remain enabled
        # during the test so the user can freely customize appearance without affecting execution.
        if hasattr(self, "db_refresh_btn"):
            self.db_refresh_btn.configure(state=state)
        if hasattr(self, "db_export_btn"):
            self.db_export_btn.configure(state=state)

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

            done_msg = f"\n[SUCCESS] Completed {strategy} test run and saved to database!\n"
            self.raw_console_content += done_msg

            # Switch view to short summary table automatically
            self.log_mode_segmented.set("Short Summary (Table)")
            self.textbox.delete("1.0", "end")
            self.textbox.insert("end", self.short_log_content or self.raw_console_content)

            self.status_label.configure(text="Finished (Saved to Database Tab)", text_color="#34d399")

            # Refresh database tab so latest test is immediately visible
            self.after(200, self._db_load_tests)

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
