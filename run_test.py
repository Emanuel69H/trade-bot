import concurrent.futures
import json
import os
import re
import subprocess
import webbrowser
from itertools import product
from pathlib import Path

try:
    import customtkinter as ctk
    HAS_CTK = True
except ImportError:
    HAS_CTK = False

ld = 20260830


class RunTest:
    TR_LY = f"20250325-{ld}"
    TR_1Y = f"20250101-{ld}"
    TR_2Y = f"20240101-{ld}"
    TR_3Y = f"20230101-{ld}"
    TR_5Y = f"20210101-{ld}"
    TR_6M = f"20250601-{ld}"

    def __init__(self, service_name: str = "freqtrade_a", timerange: str | None = None) -> None:
        self.service_name = service_name
        self.timerange = timerange or self.TR_LY
        self.current_strategy: str | None = None
        self.current_config_file: str | None = None

        self.setup: dict[str, dict] = {
            "AdxDmiRobustV2": {
                "pairs": [
                    "ETH/USDT",
                    "XRP/USDT",
                    "DOGE/USDT",
                    "BTC/USDT",
                ],
                "TT": ["1h", "2h"],
                "MOP": [2, 3, 4],
            },
            "RegimeAdaptiveMaster": {
                "pairs": [
                    "ETH/USDT",
                    "XRP/USDT",
                    "DOGE/USDT",
                    "BTC/USDT",
                ],
                "TT": ["1h"],
                "MOP": [2, 4],
            },
            "DonchianBreakoutADXChop": {
                "pairs": [
                    "XRP/USDT",
                    "DOGE/USDT",
                    "ETH/USDT",
                ],
                "TT": ["1h"],
                "MOP": [4],
            },
            "UniversalMACD": {
                "pairs": [
                    "ETH/USDT",
                    "BTC/USDT",
                ],
                "TT": ["5m"],
                "MOP": [1],
            },
            "SupertrendEmaAdx": {
                "pairs": [
                    "DOGE/USDT",
                    "XRP/USDT",
                    "BTC/USDT",
                    "ETH/USDT",
                    "BNB/USDT",
                ],
                "TT": ["1h"],
                "MOP": [1],
            },
            "Supertrend": {
                "pairs": [
                    "DOGE/USDT",
                    "XRP/USDT",
                    "BTC/USDT",
                    "TRX/USDT",
                    "UNI/USDT",
                    "LINK/USDT",
                    "BCH/USDT",
                    "ETH/USDT",
                    "BNB/USDT",
                    "ADA/USDT",
                    "AVAX/USDT",
                ],
                "TT": ["1h", "2h", "4h"],
                "MOP": [5, 8, 10],
            },
            "AlmaMacdStrategy": {
                "pairs": [
                    "DOGE/USDT",
                ],
                "TT": ["2h"],
                "MOP": [1],
            },
            "VwapMacdStrategy": {
                "pairs": [
                    "BTC/USDT",
                    "ETH/USDT",
                    "BNB/USDT",
                    "XRP/USDT",
                    "DOGE/USDT",
                ],
                "TT": ["15m", "30m", "1h"],
                "MOP": [3, 4, 5, 6],
            },
            "EMA": {
                "pairs": [
                    "BTC/USDT",
                    "ETH/USDT",
                    "BNB/USDT",
                    "XRP/USDT",
                    "DOGE/USDT",
                ],
                "TT": ["15m"],
                "MOP": [5],
            },
            "AdxDmiOnlyStrategy": {
                "pairs": [
                    "ETH/USDT",
                    "XRP/USDT",
                    "BTC/USDT",
                ],
                "TT": ["2h"],
                "MOP": [2, 3, 4],
            },
        }

    def runtest(self, strategy: str, download: bool = False, test: bool = True) -> list[dict]:
        cfg = self._get_strategy_config(strategy)
        timeframes = self._ensure_list(cfg["TT"])
        max_open_trades_values = cfg["MOP"]
        pairs = cfg["pairs"]

        config_file = f"user_data/{strategy}_test_config.json"
        if not os.path.exists(config_file):
            config_file = "user_data/config_a.json"

        self._sanitize_config(config_file)
        self.current_strategy = strategy
        self.current_config_file = config_file

        pair_label = "_".join(pairs).replace("/", "-")
        timeframe_label = "_".join(timeframes)
        result_log = Path(f"long.test.result.{strategy}.{timeframe_label}.{pair_label}.log")
        short_log = Path(f"short.test.result.{strategy}.{timeframe_label}.{pair_label}.log")
        test_cases = list(product(timeframes, max_open_trades_values))

        if download:
            self._download_data(config_file, pairs, timeframes)

        if not test:
            return []

        print(f"Running backtests for {strategy}...")

        results: list[dict] = []
        has_error = False

        with concurrent.futures.ThreadPoolExecutor(max_workers=len(test_cases)) as executor:
            futures = {
                executor.submit(
                    self._run_backtest,
                    strategy,
                    config_file,
                    timeframe,
                    mot,
                ): (timeframe, mot)
                for timeframe, mot in test_cases
            }

            for future in concurrent.futures.as_completed(futures):
                timeframe, mot = futures[future]
                try:
                    result = future.result()
                    results.append(result)

                    parsed = result["parsed"]
                    balance = parsed["final_balance_usdt"]
                    reported_mot = parsed["reported_max_open_trades"]
                    reported_timeframe = parsed["reported_timeframe"]

                    if result["returncode"] != 0:
                        has_error = True
                        print(
                            f"[FAILED] strategy={strategy}, timeframe={timeframe}, max-open-trades={mot} "
                            f"(see {result['log_file']})"
                        )
                    else:
                        print(
                            f"[OK] strategy={strategy}, timeframe={timeframe}, requested={mot}, "
                            f"reported={reported_mot}, reported_tf={reported_timeframe}, balance={balance}"
                        )

                except Exception as exc:
                    has_error = True
                    print(f"[ERROR] strategy={strategy}, timeframe={timeframe}, max-open-trades={mot}: {exc}")

        if not results:
            raise RuntimeError("No test results were produced.")

        self._build_full_result(results, result_log)
        self._build_short_result(results, short_log)

        # Auto-save to SQLite Test Database
        try:
            import test_db
            short_content = short_log.read_text(encoding="utf-8") if short_log.exists() else ""
            full_content = result_log.read_text(encoding="utf-8") if result_log.exists() else ""

            profits = [r["parsed"]["total_profit_pct"] for r in results if r.get("parsed") and r["parsed"].get("total_profit_pct") is not None]
            best_profit = max(profits) if profits else 0.0
            drawdowns = [r["parsed"]["drawdown_pct"] for r in results if r.get("parsed") and r["parsed"].get("drawdown_pct") is not None]
            max_dd = max(drawdowns) if drawdowns else 0.0
            win_pcts = [r["parsed"]["win_pct"] for r in results if r.get("parsed") and r["parsed"].get("win_pct") is not None]
            avg_win = sum(win_pcts) / len(win_pcts) if win_pcts else 0.0
            trades = [r["parsed"]["trades"] for r in results if r.get("parsed") and r["parsed"].get("trades") is not None]
            tot_trades = sum(trades) if trades else 0
            balances = [r["parsed"]["final_balance_usdt"] for r in results if r.get("parsed") and r["parsed"].get("final_balance_usdt") is not None]
            final_bal = max(balances) if balances else 0.0

            testname = f"{strategy}_{timeframe_label}_{self.timerange}"
            tid = test_db.save_test(
                testname=testname,
                strategy=strategy,
                timerange=self.timerange,
                timeframe=timeframe_label,
                max_open_trades=",".join(str(m) for m in max_open_trades_values),
                pairs=pairs,
                short_result=short_content,
                long_result=full_content,
                status="WARNING" if has_error else "SUCCESS",
                profit_pct=best_profit,
                drawdown_pct=max_dd,
                win_rate_pct=avg_win,
                total_trades=tot_trades,
                final_balance=final_bal,
            )
            print(f"[DATABASE] Test run successfully stored in database with ID: {tid}")
        except Exception as db_exc:
            print(f"[DATABASE NOTICE] Could not auto-save to test_db: {db_exc}")

        if has_error:
            print("[WARNING] One or more backtests exited with error.")

        return results

    def plot_data(self, pair: str | None = None, timeframe: str | None = None) -> None:
        if not self.current_strategy or not self.current_config_file:
            raise RuntimeError("No active strategy selected. Call runtest(strategy, download) first.")

        cfg = self._get_strategy_config(self.current_strategy)
        timeframes = [timeframe] if timeframe is not None else self._ensure_list(cfg["TT"])
        pairs = [pair] if pair is not None else cfg["pairs"]

        for tf in timeframes:
            for plot_pair in pairs:
                cmd = [
                    "docker",
                    "compose",
                    "run",
                    "--rm",
                    self.service_name,
                    "plot-dataframe",
                    "-s",
                    self.current_strategy,
                    "-p",
                    plot_pair,
                    "--config",
                    self.current_config_file,
                    "--timeframe",
                    tf,
                ]
                rc, output = self._run_command(cmd)

                stored_plot = False
                for line in output.splitlines():
                    if "INFO - Stored plot as" in line:
                        raw_path = line.split("INFO - Stored plot as", 1)[1].strip()
                        if raw_path.startswith("/freqtrade/"):
                            raw_path = raw_path.removeprefix("/freqtrade/")
                        path = str(Path(raw_path))
                        self.open_in_browser(path)
                        stored_plot = True

                if not stored_plot:
                    print(f"[PLOT WARNING] No output plot path found for timeframe={tf}, pair={plot_pair}")

    @staticmethod
    def _ensure_list(value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [value]
        return value

    def _get_strategy_config(self, strategy: str) -> dict:
        if strategy in self.setup:
            return self.setup[strategy]

        # Dynamic fallback for any custom strategy placed in user_data/strategies/
        pairs = ["ETH/USDT", "XRP/USDT", "DOGE/USDT", "BTC/USDT"]
        try:
            if os.path.exists("user_data/config_a.json"):
                with open("user_data/config_a.json", "r", encoding="utf-8") as f:
                    c = json.load(f)
                    whitelist = c.get("exchange", {}).get("pair_whitelist")
                    if whitelist:
                        pairs = whitelist
        except Exception:
            pass

        return {
            "pairs": pairs,
            "TT": ["1h"],
            "MOP": [2, 4],
        }

    @staticmethod
    def _run_command(cmd: list[str]) -> tuple[int, str]:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        return proc.returncode, proc.stdout

    @staticmethod
    def _sanitize_config(config_file: str) -> None:
        """Ensures the config file strictly adheres to Freqtrade's JSON schema (e.g. api_server requirements)"""
        if not os.path.exists(config_file):
            return
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            modified = False
            if "api_server" in data:
                api = data["api_server"]
                reqs = {
                    "enabled": False,
                    "listen_ip_address": "0.0.0.0",
                    "listen_port": 8080,
                    "verbosity": "error",
                    "enable_openapi": False,
                    "jwt_secret_key": "b9f02031e48864fbb4a11c8b62b38e8be7110bdcaf1d1ebd935545124b33aa2d",
                    "ws_token": "lB9vtd_FdyvtGkEJaIq2VF2BqvEEekPnyw",
                    "CORS_origins": ["http://127.0.0.1:8081", "http://localhost:3000"],
                    "username": "super-trader",
                    "password": "_f5eL-7x9T=DEdnFS'-#Kzubu^Yu^4^4!Euqc*X:2.7DV_MAULm/Sp23u]#]g2C",
                }
                for k, v in reqs.items():
                    if k not in api:
                        api[k] = v
                        modified = True
                if "_test_config" in config_file and api.get("enabled") is True:
                    api["enabled"] = False
                    modified = True

            if modified:
                with open(config_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=4)
        except Exception:
            pass

    def _download_data(self, config_file: str, pairs: list[str], timeframes: list[str]) -> None:
        self._sanitize_config(config_file)
        cmd = [
            "docker",
            "compose",
            "run",
            "--rm",
            self.service_name,
            "download-data",
            "--config",
            config_file,
            "--erase",
            "--exchange",
            "binance",
            "--trading-mode",
            "spot",
            "--pairs",
            *pairs,
            "--timeframes",
            *timeframes,
            "--timerange",
            self.timerange,
        ]

        print("Running download-data...")
        rc, output = self._run_command(cmd)
        Path("download-data.log").write_text(output, encoding="utf-8")

        if rc != 0:
            raise RuntimeError("download-data failed. Check download-data.log")

    def _run_backtest(
        self,
        strategy: str,
        config_file: str,
        timeframe: str,
        max_open_trades: int,
    ) -> dict:
        self._sanitize_config(config_file)
        log_file = Path(f"test.{strategy}.{timeframe}.{self.timerange}.mot{max_open_trades}.log")

        cmd = [
            "docker",
            "compose",
            "run",
            "--rm",
            self.service_name,
            "backtesting",
            "--cache",
            "none",
            "--breakdown",
            "month",
            "year",
            "--max-open-trades",
            str(max_open_trades),
            "--config",
            config_file,
            "--strategy",
            strategy,
            "--timerange",
            self.timerange,
            "--timeframe",
            timeframe,
        ]

        rc, output = self._run_command(cmd)
        log_file.write_text(output, encoding="utf-8")

        parsed = self._parse_backtest_output(output, timeframe, max_open_trades)

        return {
            "timeframe": timeframe,
            "max_open_trades": max_open_trades,
            "returncode": rc,
            "output": output,
            "log_file": str(log_file),
            "parsed": parsed,
        }

    @staticmethod
    def _build_full_result(results: list[dict], result_log: Path) -> None:
        lines: list[str] = []
        sep = "-" * 79

        lines.append(sep)
        for result in sorted(results, key=lambda x: (x["timeframe"], x["max_open_trades"])):
            timeframe = result["timeframe"]
            mot = result["max_open_trades"]
            lines.append(f"Testing timeframe={timeframe}, max-open-trades={mot}")
            lines.append(result["output"].rstrip())
            lines.append(sep)

        result_log.write_text("\n".join(lines) + "\n", encoding="utf-8")

    @staticmethod
    def _build_short_result(results: list[dict], short_log: Path) -> None:
        rows = []

        for r in sorted(results, key=lambda x: (x["parsed"]["requested_timeframe"], x["parsed"]["requested_max_open_trades"])):
            p = r["parsed"]
            rows.append([
                p["requested_timeframe"],
                str(p["requested_max_open_trades"]),
                str(p["reported_max_open_trades"]) if p["reported_max_open_trades"] is not None else "-",
                f'{p["final_balance_usdt"]:.3f}' if p["final_balance_usdt"] is not None else "-",
                f'{p["total_profit_pct"]:.2f}%' if p["total_profit_pct"] is not None else "-",
                f'{p["drawdown_pct"]:.2f}%' if p["drawdown_pct"] is not None else "-",
                f'{p["drawdown_usdt"]:.3f}' if p["drawdown_usdt"] is not None else "-",
                str(p["trades"]) if p["trades"] is not None else "-",
                f'{p["win_pct"]:.1f}%' if p["win_pct"] is not None else "-",
                "OK" if r["returncode"] == 0 else "FAILED",
            ])

        headers = [
            "TF",
            "Req MOT",
            "Rep MOT",
            "Final Balance",
            "Tot Profit %",
            "Drawdown %",
            "Drawdown USDT",
            "Trades",
            "Win %",
            "Status",
        ]

        if not rows:
            text = "No parsed results found.\n"
            print(text, end="")
            short_log.write_text(text, encoding="utf-8")
            return

        widths = [len(h) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                widths[i] = max(widths[i], len(cell))

        def fmt(row: list[str]) -> str:
            return " | ".join(cell.ljust(widths[i]) for i, cell in enumerate(row))

        sep = "-+-".join("-" * w for w in widths)
        lines = [fmt(headers), sep]
        for row in rows:
            lines.append(fmt(row))

        table_text = "\n".join(lines) + "\n"
        print(table_text, end="")
        short_log.write_text(table_text, encoding="utf-8")

    @staticmethod
    def _parse_backtest_output(output: str, requested_timeframe: str, requested_mot: int) -> dict:
        parsed = {
            "requested_timeframe": requested_timeframe,
            "requested_max_open_trades": requested_mot,
            "reported_max_open_trades": None,
            "reported_timeframe": None,
            "final_balance_usdt": None,
            "start": None,
            "end": None,
            "strategy": None,
            "trades": None,
            "avg_profit_pct": None,
            "total_profit_usdt": None,
            "total_profit_pct": None,
            "win_pct": None,
            "drawdown_usdt": None,
            "drawdown_pct": None,
        }

        m_balance = re.search(r"Final balance\s*│\s*([\d.]+)\s+USDT", output, re.IGNORECASE)
        if m_balance:
            parsed["final_balance_usdt"] = float(m_balance.group(1))

        m_timeframe = re.search(r"Strategy using timeframe:\s*([^\r\n]+)", output, re.IGNORECASE)
        if m_timeframe:
            parsed["reported_timeframe"] = m_timeframe.group(1).strip()

        m_backtested = re.search(
            r"Backtested\s+(.+?)\s*->\s*(.+?)\s*\|\s*Max open trades\s*:\s*(\d+)",
            output,
            re.IGNORECASE,
        )
        if m_backtested:
            parsed["start"] = m_backtested.group(1)
            parsed["end"] = m_backtested.group(2)
            parsed["reported_max_open_trades"] = int(m_backtested.group(3))

        strategy_row_re = re.compile(
            r"│\s*(?P<strategy>[^│]+?)\s*"
            r"│\s*(?P<trades>\d+)\s*"
            r"│\s*(?P<avg_profit_pct>-?[\d.]+)\s*"
            r"│\s*(?P<tot_profit_usdt>-?[\d.]+)\s*"
            r"│\s*(?P<tot_profit_pct>-?[\d.]+)\s*"
            r"│\s*(?P<avg_duration>[^│]+?)\s*"
            r"│\s*(?P<win_draw_loss>[^│]+?)\s*"
            r"│\s*(?P<drawdown_usdt>-?[\d.]+)\s+USDT\s+(?P<drawdown_pct>-?[\d.]+)%\s*│",
            re.IGNORECASE,
        )

        m_strategy = strategy_row_re.search(output)
        if m_strategy:
            parsed["strategy"] = m_strategy.group("strategy").strip()
            parsed["trades"] = int(m_strategy.group("trades"))
            parsed["avg_profit_pct"] = float(m_strategy.group("avg_profit_pct"))
            parsed["total_profit_usdt"] = float(m_strategy.group("tot_profit_usdt"))
            parsed["total_profit_pct"] = float(m_strategy.group("tot_profit_pct"))
            parsed["drawdown_usdt"] = float(m_strategy.group("drawdown_usdt"))
            parsed["drawdown_pct"] = float(m_strategy.group("drawdown_pct"))

            m_winpct = re.search(r"(-?[\d.]+)\s*$", m_strategy.group("win_draw_loss"))
            if m_winpct:
                parsed["win_pct"] = float(m_winpct.group(1))

        return parsed

    @staticmethod
    def open_in_browser(file_path: str) -> None:
        try:
            browser_path = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
            webbrowser.register(
                "brave",
                None,
                webbrowser.BackgroundBrowser(browser_path),
            )
            file_url = "file://" + os.path.abspath(file_path)
            webbrowser.get("brave").open(file_url)
        except Exception:
            try:
                webbrowser.open("file://" + os.path.abspath(file_path))
            except Exception as exc:
                print(f"[BROWSER FAILED] {exc}. File: {file_path}")


def Tonification(title="Notification", message="Done", duration=3000, master=None):
    if not HAS_CTK:
        print(f"[{title}] {message}")
        return

    try:
        import tkinter as tk
        root_exists = (master is not None) or (tk._default_root is not None)

        if root_exists:
            parent = master if master is not None else tk._default_root
            toast = ctk.CTkToplevel(parent)
        else:
            toast = ctk.CTk()

        width = 320
        height = 100
        toast.title("")
        toast.resizable(False, False)
        toast.overrideredirect(True)
        toast.attributes("-topmost", True)
        toast.update_idletasks()

        screen_w = toast.winfo_screenwidth()
        screen_h = toast.winfo_screenheight()
        x = screen_w - width - 20
        y = screen_h - height - 60
        toast.geometry(f"{width}x{height}+{x}+{y}")

        frame = ctk.CTkFrame(toast, corner_radius=12, fg_color="#1e293b")
        frame.pack(fill="both", expand=True, padx=2, pady=2)

        title_label = ctk.CTkLabel(frame, text=title, font=("Arial", 14, "bold"), text_color="#38bdf8")
        title_label.pack(pady=(10, 2), padx=12)

        msg_label = ctk.CTkLabel(frame, text=message, font=("Arial", 11), text_color="#f8fafc", wraplength=280, justify="left")
        msg_label.pack(pady=(0, 10), padx=12)

        def _safe_close():
            try:
                if toast.winfo_exists():
                    toast.destroy()
            except Exception:
                pass

        toast.after(duration, _safe_close)

        if not root_exists:
            toast.mainloop()
    except Exception as exc:
        print(f"[{title}] {message}")


if __name__ == "__main__":
    download = False
    test = True

    tester = RunTest(timerange="20210101-20260830")
    tester.runtest("AdxDmiRobustV2", download=download, test=test)
    Tonification("Freqtrade test", "Test was completed", 3000)
