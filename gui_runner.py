#!/usr/bin/env python3
"""
Freqtrade Desktop GUI Test Runner
Built with CustomTkinter for quick local strategy execution and analysis.
Run with: python gui_runner.py
"""
import sys
import threading
from pathlib import Path
from run_test import RunTest, Tonification, HAS_CTK

if not HAS_CTK:
    print("[ERROR] customtkinter is required for gui_runner.py.")
    print("Install via: pip install customtkinter")
    sys.exit(1)

import customtkinter as ctk

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


class FreqtradeGuiRunner(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Freqtrade Strategy GUI Runner")
        self.geometry("980x740")
        self.minsize(850, 600)

        self.tester = RunTest()
        self.strategies = list(self.tester.setup.keys())
        self.timeranges = [
            ("5 Years (2021-2026)", self.tester.TR_5Y),
            ("3 Years (2023-2026)", self.tester.TR_3Y),
            ("2 Years (2024-2026)", self.tester.TR_2Y),
            ("1 Year (2025-2026)", self.tester.TR_1Y),
            ("6 Months (2025-2026)", self.tester.TR_6M),
            ("Latest (20250325-2026)", self.tester.TR_LY),
        ]

        self._build_ui()

    def _build_ui(self):
        # Header
        header_frame = ctk.CTkFrame(self, fg_color="#0f172a", corner_radius=0)
        header_frame.pack(fill="x", padx=0, pady=0)

        title = ctk.CTkLabel(
            header_frame,
            text="⚡ Freqtrade Backtest GUI Orchestrator",
            font=("Arial", 18, "bold"),
            text_color="#38bdf8",
        )
        title.pack(side="left", padx=20, pady=14)

        subtitle = ctk.CTkLabel(
            header_frame,
            text="Multi-threaded Docker Test Matrix",
            font=("Arial", 12),
            text_color="#94a3b8",
        )
        subtitle.pack(side="left", padx=10, pady=14)

        # Control Panel
        control_frame = ctk.CTkFrame(self, fg_color="#1e293b", corner_radius=10)
        control_frame.pack(fill="x", padx=16, pady=12)

        # Row 1: Strategy & Timerange
        row1 = ctk.CTkFrame(control_frame, fg_color="transparent")
        row1.pack(fill="x", padx=12, pady=10)

        ctk.CTkLabel(row1, text="Strategy:", font=("Arial", 13, "bold")).pack(side="left", padx=(0, 8))
        self.strat_menu = ctk.CTkOptionMenu(
            row1,
            values=self.strategies,
            width=240,
            command=self._on_strategy_change,
        )
        self.strat_menu.set("AdxDmiRobustV2" if "AdxDmiRobustV2" in self.strategies else self.strategies[0])
        self.strat_menu.pack(side="left", padx=(0, 20))

        ctk.CTkLabel(row1, text="Timerange:", font=("Arial", 13, "bold")).pack(side="left", padx=(0, 8))
        self.tr_menu = ctk.CTkOptionMenu(
            row1,
            values=[label for label, _ in self.timeranges],
            width=220,
        )
        self.tr_menu.set(self.timeranges[0][0])
        self.tr_menu.pack(side="left", padx=(0, 20))

        self.download_var = ctk.BooleanVar(value=False)
        self.download_cb = ctk.CTkCheckBox(row1, text="Download Data First", variable=self.download_var)
        self.download_cb.pack(side="left")

        # Row 2: Config Info Display
        self.info_label = ctk.CTkLabel(
            control_frame,
            text="",
            font=("Consolas", 11),
            text_color="#34d399",
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

        self.status_label = ctk.CTkLabel(
            btn_row,
            text="Ready",
            font=("Arial", 12),
            text_color="#94a3b8",
        )
        self.status_label.pack(side="left", padx=10)

        # Output Terminal & Results Area
        output_frame = ctk.CTkFrame(self, fg_color="#090d16", corner_radius=10)
        output_frame.pack(fill="both", expand=True, padx=16, pady=(0, 16))

        term_title = ctk.CTkLabel(
            output_frame,
            text="Execution Log & Table Results",
            font=("Consolas", 12, "bold"),
            text_color="#cbd5e1",
        )
        term_title.pack(anchor="w", padx=12, pady=(8, 4))

        self.textbox = ctk.CTkTextbox(
            output_frame,
            font=("Consolas", 12),
            text_color="#f1f5f9",
            fg_color="#020617",
            wrap="none",
        )
        self.textbox.pack(fill="both", expand=True, padx=8, pady=(0, 8))
        self.textbox.insert("end", "[INFO] Freqtrade GUI Runner Initialized. Select a strategy and click 'Run Backtest Matrix'.\n")

    def _on_strategy_change(self, strategy: str):
        cfg = self.tester.setup.get(strategy, {})
        pairs = ", ".join(cfg.get("pairs", []))
        timeframes = ", ".join(cfg.get("TT", []))
        mop = ", ".join(str(x) for x in cfg.get("MOP", []))
        self.info_label.configure(
            text=f"Configuration for {strategy} -> Timeframes: [{timeframes}] | Max Open Trades: [{mop}] | Pairs: {pairs}"
        )

    def _start_run_thread(self):
        strategy = self.strat_menu.get()
        selected_tr_label = self.tr_menu.get()
        timerange = next(tr for lbl, tr in self.timeranges if lbl == selected_tr_label)
        download = self.download_var.get()

        # Disable all UI controls while test is running
        self.run_btn.configure(state="disabled")
        self.strat_menu.configure(state="disabled")
        self.tr_menu.configure(state="disabled")
        self.download_cb.configure(state="disabled")
        self.plot_btn.configure(state="disabled")

        self.status_label.configure(text=f"Running {strategy}...", text_color="#fbbf24")

        self.textbox.insert("end", f"\n=======================================================\n")
        self.textbox.insert("end", f"[START] Running backtests for {strategy} on {timerange}\n")
        self.textbox.insert("end", f"=======================================================\n")

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
            short_logs = list(Path(".").glob(f"short.test.result.{strategy}.*.log"))
            if short_logs:
                content = short_logs[-1].read_text(encoding="utf-8")
                self.textbox.insert("end", "\n[RESULT SUMMARY TABLE]\n" + content + "\n")

            self.status_label.configure(text="Finished Successfully", text_color="#34d399")
            Tonification("Freqtrade Backtest", f"Completed {strategy} test!", 3000)

        except Exception as exc:
            self.textbox.insert("end", f"\n[ERROR] {exc}\n")
            self.status_label.configure(text="Failed with errors", text_color="#f87171")
        finally:
            # Re-enable all UI controls when test completes or errors
            self.run_btn.configure(state="normal")
            self.strat_menu.configure(state="normal")
            self.tr_menu.configure(state="normal")
            self.download_cb.configure(state="normal")
            self.plot_btn.configure(state="normal")

    def _plot_current(self):
        try:
            strategy = self.strat_menu.get()
            self.tester.current_strategy = strategy
            self.tester.current_config_file = f"user_data/{strategy}_test_config.json"
            self.tester.plot_data()
        except Exception as exc:
            self.textbox.insert("end", f"[PLOT ERROR] {exc}\n")


if __name__ == "__main__":
    app = FreqtradeGuiRunner()
    app.mainloop()
