#!/usr/bin/env python3
"""
Test Database Module for Freqtrade Strategy Suite
Manages historical backtest runs in a local SQLite database (user_data/backtests.db).
Stores and retrieves:
- ID, Test Name, Timestamp, Strategy, Timeframes, Timerange, MOT, Pairs, Status
- Short Result (Formatted ASCII table)
- Long Result (Full raw logs / trade breakdown)
- Full Algorithm Code (Python strategy file content at test time)
- Full Configuration JSON (Exact parameters used for execution)
- Key Metrics: Profit %, Drawdown %, Win Rate %, Total Trades, Final Balance
- Tags, Notes, Favorites, and Export/Import functionality
"""

import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


def get_db_path() -> Path:
    """Returns the path to the SQLite database file, ensuring parent directory exists."""
    user_data = Path("user_data")
    if not user_data.exists():
        try:
            user_data.mkdir(parents=True, exist_ok=True)
        except Exception:
            return Path("backtests.db")
    return user_data / "backtests.db"


def get_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    path = db_path or get_db_path()
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Optional[Path] = None) -> None:
    """Initializes the SQLite database tables and indexes."""
    conn = get_connection(db_path)
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tests (
                id TEXT PRIMARY KEY,
                testname TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                strategy TEXT NOT NULL,
                timeframe TEXT,
                timerange TEXT,
                max_open_trades TEXT,
                pairs TEXT,
                status TEXT DEFAULT 'SUCCESS',
                short_result TEXT,
                long_result TEXT,
                full_algorithm_code TEXT,
                full_config TEXT,
                profit_pct REAL DEFAULT 0.0,
                drawdown_pct REAL DEFAULT 0.0,
                win_rate_pct REAL DEFAULT 0.0,
                total_trades INTEGER DEFAULT 0,
                final_balance REAL DEFAULT 0.0,
                duration_seconds REAL DEFAULT 0.0,
                tags TEXT DEFAULT '[]',
                notes TEXT DEFAULT '',
                favorite INTEGER DEFAULT 0
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tests_strategy ON tests(strategy)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tests_timestamp ON tests(timestamp DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tests_profit ON tests(profit_pct DESC)")
    conn.close()


def generate_test_id() -> str:
    """Generates a sequential human-readable test ID based on the current timestamp."""
    now = datetime.now()
    return f"TEST-{now.strftime('%Y%m%d-%H%M%S')}"


def save_test(
    testname: str,
    strategy: str,
    timerange: str,
    timeframe: str = "",
    max_open_trades: str = "",
    pairs: Optional[List[str]] = None,
    short_result: str = "",
    long_result: str = "",
    full_algorithm_code: str = "",
    full_config: str = "",
    status: str = "SUCCESS",
    profit_pct: float = 0.0,
    drawdown_pct: float = 0.0,
    win_rate_pct: float = 0.0,
    total_trades: int = 0,
    final_balance: float = 0.0,
    duration_seconds: float = 0.0,
    tags: Optional[List[str]] = None,
    notes: str = "",
    favorite: bool = False,
    test_id: Optional[str] = None,
    db_path: Optional[Path] = None,
) -> str:
    """
    Saves a complete test run record into the database.
    If strategy code or config is omitted, attempts to auto-load from disk.
    """
    init_db(db_path)
    tid = test_id or generate_test_id()
    now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Auto-load strategy code if not explicitly passed
    if not full_algorithm_code:
        strat_candidates = [
            Path(f"user_data/strategies/{strategy}.py"),
            Path(f"strategies/{strategy}.py"),
            Path(f"{strategy}.py"),
        ]
        for candidate in strat_candidates:
            if candidate.exists():
                try:
                    full_algorithm_code = candidate.read_text(encoding="utf-8")
                    break
                except Exception:
                    pass

    # Auto-load config if not explicitly passed
    if not full_config:
        cfg_candidates = [
            Path(f"user_data/{strategy}_test_config.json"),
            Path("user_data/config_a.json"),
            Path("config.json"),
        ]
        for candidate in cfg_candidates:
            if candidate.exists():
                try:
                    full_config = candidate.read_text(encoding="utf-8")
                    break
                except Exception:
                    pass

    pairs_json = json.dumps(pairs or [])
    tags_json = json.dumps(tags or [])

    conn = get_connection(db_path)
    with conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO tests (
                id, testname, timestamp, strategy, timeframe, timerange,
                max_open_trades, pairs, status, short_result, long_result,
                full_algorithm_code, full_config, profit_pct, drawdown_pct,
                win_rate_pct, total_trades, final_balance, duration_seconds,
                tags, notes, favorite
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                tid,
                testname,
                now_iso,
                strategy,
                timeframe,
                timerange,
                str(max_open_trades),
                pairs_json,
                status,
                short_result,
                long_result,
                full_algorithm_code,
                full_config,
                float(profit_pct),
                float(drawdown_pct),
                float(win_rate_pct),
                int(total_trades),
                float(final_balance),
                float(duration_seconds),
                tags_json,
                notes,
                1 if favorite else 0,
            ),
        )
    conn.close()
    return tid


def list_tests(
    strategy: Optional[str] = None,
    search_query: Optional[str] = None,
    status: Optional[str] = None,
    favorites_only: bool = False,
    limit: int = 100,
    db_path: Optional[Path] = None,
) -> List[Dict[str, Any]]:
    """Lists test runs with optional filtering and sorting by timestamp descending."""
    init_db(db_path)
    conn = get_connection(db_path)

    query = "SELECT * FROM tests WHERE 1=1"
    params: List[Any] = []

    if strategy and strategy != "All":
        query += " AND strategy = ?"
        params.append(strategy)

    if status and status != "All":
        query += " AND status = ?"
        params.append(status)

    if favorites_only:
        query += " AND favorite = 1"

    if search_query:
        query += " AND (id LIKE ? OR testname LIKE ? OR notes LIKE ? OR tags LIKE ?)"
        term = f"%{search_query}%"
        params.extend([term, term, term, term])

    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        try:
            d["pairs"] = json.loads(d["pairs"]) if d.get("pairs") else []
        except Exception:
            d["pairs"] = []
        try:
            d["tags"] = json.loads(d["tags"]) if d.get("tags") else []
        except Exception:
            d["tags"] = []
        d["favorite"] = bool(d.get("favorite", 0))
        results.append(d)

    conn.close()
    return results


def get_test(test_id: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Retrieves a single test record with all full text fields."""
    init_db(db_path)
    conn = get_connection(db_path)
    row = conn.execute("SELECT * FROM tests WHERE id = ?", (test_id,)).fetchone()
    conn.close()

    if not row:
        return None

    d = dict(row)
    try:
        d["pairs"] = json.loads(d["pairs"]) if d.get("pairs") else []
    except Exception:
        d["pairs"] = []
    try:
        d["tags"] = json.loads(d["tags"]) if d.get("tags") else []
    except Exception:
        d["tags"] = []
    d["favorite"] = bool(d.get("favorite", 0))
    return d


def delete_test(test_id: str, db_path: Optional[Path] = None) -> bool:
    """Deletes a test record from the database."""
    init_db(db_path)
    conn = get_connection(db_path)
    with conn:
        cursor = conn.execute("DELETE FROM tests WHERE id = ?", (test_id,))
        deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def toggle_favorite(test_id: str, db_path: Optional[Path] = None) -> bool:
    """Toggles the favorite flag on a test record."""
    init_db(db_path)
    conn = get_connection(db_path)
    with conn:
        row = conn.execute("SELECT favorite FROM tests WHERE id = ?", (test_id,)).fetchone()
        if not row:
            conn.close()
            return False
        new_val = 0 if row["favorite"] else 1
        conn.execute("UPDATE tests SET favorite = ? WHERE id = ?", (new_val, test_id))
    conn.close()
    return bool(new_val)


def update_notes(
    test_id: str,
    notes: str,
    tags: Optional[List[str]] = None,
    db_path: Optional[Path] = None,
) -> bool:
    """Updates user notes and tags for a given test."""
    init_db(db_path)
    conn = get_connection(db_path)
    with conn:
        if tags is not None:
            conn.execute(
                "UPDATE tests SET notes = ?, tags = ? WHERE id = ?",
                (notes, json.dumps(tags), test_id),
            )
        else:
            conn.execute("UPDATE tests SET notes = ? WHERE id = ?", (notes, test_id))
    conn.close()
    return True


def export_to_json(filepath: Path | str, db_path: Optional[Path] = None) -> int:
    """Exports all tests to a JSON file."""
    tests = list_tests(limit=10000, db_path=db_path)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(tests, f, indent=2, ensure_ascii=False)
    return len(tests)


def import_from_json(filepath: Path | str, db_path: Optional[Path] = None) -> int:
    """Imports tests from a JSON file into the database."""
    with open(filepath, "r", encoding="utf-8") as f:
        tests = json.load(f)

    count = 0
    for t in tests:
        save_test(
            test_id=t.get("id"),
            testname=t.get("testname", "Imported Test"),
            strategy=t.get("strategy", "Unknown"),
            timerange=t.get("timerange", ""),
            timeframe=t.get("timeframe", ""),
            max_open_trades=str(t.get("max_open_trades", "")),
            pairs=t.get("pairs", []),
            short_result=t.get("short_result", ""),
            long_result=t.get("long_result", ""),
            full_algorithm_code=t.get("full_algorithm_code", ""),
            full_config=t.get("full_config", ""),
            status=t.get("status", "SUCCESS"),
            profit_pct=float(t.get("profit_pct", 0.0)),
            drawdown_pct=float(t.get("drawdown_pct", 0.0)),
            win_rate_pct=float(t.get("win_rate_pct", 0.0)),
            total_trades=int(t.get("total_trades", 0)),
            final_balance=float(t.get("final_balance", 0.0)),
            duration_seconds=float(t.get("duration_seconds", 0.0)),
            tags=t.get("tags", []),
            notes=t.get("notes", ""),
            favorite=bool(t.get("favorite", False)),
            db_path=db_path,
        )
        count += 1
    return count


if __name__ == "__main__":
    init_db()
    print(f"[OK] Database initialized at: {get_db_path()}")
    existing = list_tests()
    print(f"[INFO] Current stored tests: {len(existing)}")
