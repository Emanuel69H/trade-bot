import React, { useState, useMemo, useEffect } from 'react';
import {
  Database,
  Search,
  Filter,
  Download,
  Upload,
  Star,
  Copy,
  Check,
  Code2,
  Settings,
  FileText,
  Sliders,
  Scale,
  Calendar,
  Layers,
  ArrowUpDown,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Plus,
  RefreshCw,
  Eye,
  Maximize2,
  Share2,
} from 'lucide-react';
import { TestRecord } from '../types/testRecord';
import { SEEDED_TESTS } from '../data/seededTests';

interface TestDatabaseBrowserProps {
  onGoToRunner?: () => void;
  onGoToStrategyCode?: () => void;
}

const LOCAL_STORAGE_KEY = 'freqtrade_tests_database_v1';

export const TestDatabaseBrowser: React.FC<TestDatabaseBrowserProps> = ({
  onGoToRunner,
  onGoToStrategyCode,
}) => {
  // Database State with local persistence
  const [tests, setTests] = useState<TestRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return SEEDED_TESTS;
  });

  // Save to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tests));
    } catch {
      // quota or private mode fallback
    }
  }, [tests]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'SUCCESS' | 'FAILED'>('All');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'profit' | 'date' | 'drawdown' | 'trades' | 'winrate'>('profit');

  // Selected test for inspector
  const [selectedTestId, setSelectedTestId] = useState<string | null>(tests[0]?.id || null);
  const [inspectorTab, setInspectorTab] = useState<'short' | 'long' | 'code' | 'config' | 'compare' | 'notes'>('short');

  // Comparison State
  const [compareTestId, setCompareTestId] = useState<string | null>(tests[1]?.id || null);

  // Inspector UI controls
  const [fontSize, setFontSize] = useState<number>(11);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Notes & Tags editing for selected test
  const [editNotes, setEditNotes] = useState('');
  const [newTagInput, setNewTagInput] = useState('');

  const selectedTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId) || tests[0] || null,
    [tests, selectedTestId]
  );

  const compareTest = useMemo(
    () => tests.find((t) => t.id === compareTestId) || null,
    [tests, compareTestId]
  );

  // Sync notes when selected test changes
  useEffect(() => {
    if (selectedTest) {
      setEditNotes(selectedTest.notes || '');
    }
  }, [selectedTestId, selectedTest]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Distinct strategies list
  const availableStrategies = useMemo(() => {
    const set = new Set<string>();
    tests.forEach((t) => set.add(t.strategy));
    return ['All', ...Array.from(set)];
  }, [tests]);

  // Filtered & Sorted tests
  const filteredTests = useMemo(() => {
    return tests
      .filter((t) => {
        if (strategyFilter !== 'All' && t.strategy !== strategyFilter) return false;
        if (statusFilter !== 'All' && t.status !== statusFilter) return false;
        if (onlyFavorites && !t.favorite) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesId = t.id.toLowerCase().includes(q);
          const matchesName = t.testname.toLowerCase().includes(q);
          const matchesStrat = t.strategy.toLowerCase().includes(q);
          const matchesNotes = (t.notes || '').toLowerCase().includes(q);
          const matchesTags = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
          return matchesId || matchesName || matchesStrat || matchesNotes || matchesTags;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'profit') return b.profit_pct - a.profit_pct;
        if (sortBy === 'date') return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        if (sortBy === 'drawdown') return a.drawdown_pct - b.drawdown_pct;
        if (sortBy === 'trades') return b.total_trades - a.total_trades;
        if (sortBy === 'winrate') return b.win_rate_pct - a.win_rate_pct;
        return 0;
      });
  }, [tests, strategyFilter, statusFilter, onlyFavorites, searchQuery, sortBy]);

  // Overall Statistics
  const stats = useMemo(() => {
    if (tests.length === 0) {
      return { total: 0, profitable: 0, maxProfit: 0, minDd: 0, avgWin: 0 };
    }
    const profitable = tests.filter((t) => t.profit_pct > 0).length;
    const maxProfit = Math.max(...tests.map((t) => t.profit_pct));
    const minDd = Math.min(...tests.map((t) => t.drawdown_pct));
    const avgWin = tests.reduce((acc, t) => acc + t.win_rate_pct, 0) / tests.length;
    return {
      total: tests.length,
      profitable: Math.round((profitable / tests.length) * 100),
      maxProfit,
      minDd,
      avgWin: Math.round(avgWin * 10) / 10,
    };
  }, [tests]);

  // Actions
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTests((prev) =>
      prev.map((t) => (t.id === id ? { ...t, favorite: !t.favorite } : t))
    );
  };

  const deleteTest = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm(`Are you sure you want to delete test run ${id}?`)) {
      setTests((prev) => prev.filter((t) => t.id !== id));
      if (selectedTestId === id) {
        const remaining = tests.filter((t) => t.id !== id);
        setSelectedTestId(remaining[0]?.id || null);
      }
      showToast(`Test ${id} deleted`);
    }
  };

  const handleSaveNotes = () => {
    if (!selectedTest) return;
    setTests((prev) =>
      prev.map((t) => (t.id === selectedTest.id ? { ...t, notes: editNotes } : t))
    );
    showToast('Notes updated successfully');
  };

  const handleAddTag = () => {
    if (!selectedTest || !newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (selectedTest.tags.includes(tag)) return;
    const updated = [...selectedTest.tags, tag];
    setTests((prev) =>
      prev.map((t) => (t.id === selectedTest.id ? { ...t, tags: updated } : t))
    );
    setNewTagInput('');
    showToast(`Added tag "${tag}"`);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedTest) return;
    const updated = selectedTest.tags.filter((t) => t !== tagToRemove);
    setTests((prev) =>
      prev.map((t) => (t.id === selectedTest.id ? { ...t, tags: updated } : t))
    );
  };

  const exportJsonDatabase = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tests, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `freqtrade_tests_database_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
    showToast(`Exported ${tests.length} tests to JSON`);
  };

  const exportCsvDatabase = () => {
    const headers = [
      'ID',
      'Test Name',
      'Timestamp',
      'Strategy',
      'Timeframe',
      'Timerange',
      'Max Open Trades',
      'Status',
      'Profit %',
      'Drawdown %',
      'Win Rate %',
      'Total Trades',
      'Final Balance',
      'Tags',
      'Notes',
    ];
    const rows = tests.map((t) => [
      `"${t.id}"`,
      `"${t.testname}"`,
      `"${t.timestamp}"`,
      `"${t.strategy}"`,
      `"${t.timeframe}"`,
      `"${t.timerange}"`,
      `"${t.max_open_trades}"`,
      `"${t.status}"`,
      t.profit_pct,
      t.drawdown_pct,
      t.win_rate_pct,
      t.total_trades,
      t.final_balance || 0,
      `"${(t.tags || []).join('; ')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `freqtrade_tests_${new Date().toISOString().slice(0, 10)}.csv`);
    dlAnchor.click();
    showToast('Exported tests to CSV');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        if (Array.isArray(imported)) {
          setTests((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newEntries = imported.filter((item) => item.id && !existingIds.has(item.id));
            return [...newEntries, ...prev];
          });
          showToast(`Successfully imported ${imported.length} tests!`);
        } else {
          alert('Invalid format: JSON file must contain an array of test records.');
        }
      } catch (err) {
        alert('Failed to parse JSON file: ' + String(err));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetToSeeds = () => {
    if (window.confirm('Reset database back to default initial test runs?')) {
      setTests(SEEDED_TESTS);
      setSelectedTestId(SEEDED_TESTS[0].id);
      showToast('Database reset to defaults');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Executive Stats Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Test Run Database & Archive</h1>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                SQLite & Portable JSON
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Browse historical backtests with instant access to Short Results, Long Logs, Algorithm Code, and Config JSON.
            </p>
          </div>
        </div>

        {/* Action Buttons: Export / Import / Reset */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            onClick={exportJsonDatabase}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Download full database as JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={exportCsvDatabase}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Download summary CSV"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleResetToSeeds}
            className="p-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800 transition"
            title="Reset to default seeded runs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Tests</span>
          <span className="text-2xl font-bold font-mono text-white mt-1">{stats.total}</span>
        </div>
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Profitable Runs</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1">{stats.profitable}%</span>
        </div>
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Peak Profit</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1">+{stats.maxProfit}%</span>
        </div>
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Lowest Drawdown</span>
          <span className="text-2xl font-bold font-mono text-cyan-400 mt-1">{stats.minDd}%</span>
        </div>
        <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Avg Win Rate</span>
          <span className="text-2xl font-bold font-mono text-indigo-400 mt-1">{stats.avgWin}%</span>
        </div>
      </div>

      {/* 2. Search, Filters & Sorting Toolbar */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name, strategy, note, tag..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Middle: Strategy Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Strategy:</span>
          </div>
          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {availableStrategies.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="All">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED">Failed Only</option>
          </select>

          {/* Favorites filter button */}
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              onlyFavorites
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Starred</span>
          </button>
        </div>

        {/* Right: Sort By */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="profit">Highest Profit %</option>
            <option value="date">Newest Date</option>
            <option value="drawdown">Lowest Drawdown</option>
            <option value="winrate">Highest Win Rate</option>
            <option value="trades">Most Trades</option>
          </select>
        </div>
      </div>

      {/* 3. Main Split View: Left List (35%) | Right Full Inspector (65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Test Run List */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-slate-300">
              Matching Records ({filteredTests.length})
            </span>
            <span className="text-[11px] font-mono text-slate-500">Click to inspect</span>
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredTests.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl">
                <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No tests match your active filter.</p>
                <p className="text-[11px] text-slate-500 mt-1">Try clearing the search query or filters.</p>
              </div>
            ) : (
              filteredTests.map((t) => {
                const isSelected = t.id === selectedTestId;
                const isProfit = t.profit_pct >= 0;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTestId(t.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left relative ${
                      isSelected
                        ? 'bg-slate-800/95 border-cyan-500/60 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/30'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    {/* Top Row: ID, Star, Profit Badge */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => toggleFavorite(t.id, e)}
                          className="text-slate-500 hover:text-amber-400 transition"
                          title="Favorite toggle"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              t.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                            }`}
                          />
                        </button>
                        <span className="text-xs font-mono font-bold text-white tracking-tight">
                          {t.id}
                        </span>
                        {t.status === 'FAILED' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            FAILED
                          </span>
                        )}
                      </div>

                      <div
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                          isProfit
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {t.profit_pct.toFixed(2)}%
                      </div>
                    </div>

                    {/* Middle Row: Test Name & Strategy */}
                    <div className="text-xs font-semibold text-slate-200 truncate mb-1">
                      {t.testname}
                    </div>

                    {/* Metric Pills */}
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span>TF: {t.timeframe || '1h'}</span>
                      <span>·</span>
                      <span>Win: {t.win_rate_pct.toFixed(1)}%</span>
                      <span>·</span>
                      <span>DD: {t.drawdown_pct.toFixed(1)}%</span>
                      <span>·</span>
                      <span>{t.total_trades} trades</span>
                    </div>

                    {/* Date stamp & Tags preview */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                      <span>{t.timestamp}</span>
                      <div className="flex items-center gap-1">
                        {(t.tags || []).slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                        {(t.tags || []).length > 2 && (
                          <span className="text-slate-500">+{t.tags.length - 2}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Full Inspector & Tabs */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          {selectedTest ? (
            <>
              {/* Selected Test Header Card */}
              <div className="p-4 bg-slate-950 border border-slate-800/90 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {selectedTest.id}
                      </span>
                      <h2 className="text-base font-bold text-white tracking-tight">
                        {selectedTest.testname}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-1">
                      <span className="text-indigo-400 font-semibold">{selectedTest.strategy}</span>
                      <span>·</span>
                      <span>Timerange: {selectedTest.timerange}</span>
                      <span>·</span>
                      <span>{selectedTest.timestamp}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleFavorite(selectedTest.id)}
                      className={`p-2 rounded-lg border transition ${
                        selectedTest.favorite
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title="Favorite test"
                    >
                      <Star className={`w-4 h-4 ${selectedTest.favorite ? 'fill-amber-400' : ''}`} />
                    </button>

                    <button
                      onClick={() => copyToClipboard(selectedTest.id, 'id')}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                      title="Copy Test ID"
                    >
                      {copiedKey === 'id' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={(e) => deleteTest(selectedTest.id, e)}
                      className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900 transition"
                      title="Delete test"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* KPI Metrics Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Total Profit</div>
                    <div className="text-sm font-bold font-mono text-emerald-400">
                      {selectedTest.profit_pct >= 0 ? '+' : ''}
                      {selectedTest.profit_pct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Max Drawdown</div>
                    <div className="text-sm font-bold font-mono text-rose-400">
                      {selectedTest.drawdown_pct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Win Rate</div>
                    <div className="text-sm font-bold font-mono text-cyan-400">
                      {selectedTest.win_rate_pct.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Total Trades</div>
                    <div className="text-sm font-bold font-mono text-white">
                      {selectedTest.total_trades}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inspector Tabs Navigation */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    onClick={() => setInspectorTab('short')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                      inspectorTab === 'short'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Short Result (Table)</span>
                  </button>

                  <button
                    onClick={() => setInspectorTab('long')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                      inspectorTab === 'long'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Long Result (Log)</span>
                  </button>

                  <button
                    onClick={() => setInspectorTab('code')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                      inspectorTab === 'code'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Full Algorithm Code</span>
                  </button>

                  <button
                    onClick={() => setInspectorTab('config')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                      inspectorTab === 'config'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Full Config</span>
                  </button>

                  <button
                    onClick={() => setInspectorTab('compare')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                      inspectorTab === 'compare'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Compare</span>
                  </button>

                  <button
                    onClick={() => setInspectorTab('notes')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                      inspectorTab === 'notes'
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Notes & Tags</span>
                  </button>
                </div>

                {/* Right Font Control for Text Tabs */}
                {(inspectorTab === 'short' || inspectorTab === 'long' || inspectorTab === 'code' || inspectorTab === 'config') && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-[11px]">Size:</span>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="px-2 py-0.5 text-xs bg-slate-950 border border-slate-800 rounded text-slate-300"
                    >
                      <option value={10}>10</option>
                      <option value={11}>11</option>
                      <option value={12}>12</option>
                      <option value={13}>13</option>
                      <option value={14}>14</option>
                      <option value={16}>16</option>
                    </select>
                  </div>
                )}
              </div>

              {/* TAB 1: Short Result (Formatted ASCII table in monospace font) */}
              {inspectorTab === 'short' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">Standardized Freqtrade Matrix Table</span>
                    <button
                      onClick={() => copyToClipboard(selectedTest.short_result, 'short')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition"
                    >
                      {copiedKey === 'short' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy ASCII Table</span>
                    </button>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800/90 rounded-xl overflow-x-auto shadow-inner">
                    <pre
                      style={{
                        fontFamily: '"Courier New", Consolas, Courier, monospace',
                        fontSize: `${fontSize}px`,
                        lineHeight: '1.45',
                      }}
                      className="text-emerald-400 whitespace-pre selection:bg-emerald-500/30 selection:text-white"
                    >
                      {selectedTest.short_result || '// No short result recorded.'}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 2: Long Result (Full Container Execution Logs) */}
              {inspectorTab === 'long' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">Full Docker Container Output & Trade Logs</span>
                    <button
                      onClick={() => copyToClipboard(selectedTest.long_result, 'long')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition"
                    >
                      {copiedKey === 'long' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Long Log</span>
                    </button>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800/90 rounded-xl overflow-x-auto max-h-[520px] overflow-y-auto shadow-inner">
                    <pre
                      style={{
                        fontFamily: '"Courier New", Consolas, Courier, monospace',
                        fontSize: `${fontSize}px`,
                        lineHeight: '1.45',
                      }}
                      className="text-slate-300 whitespace-pre selection:bg-cyan-500/30 selection:text-white"
                    >
                      {selectedTest.long_result || '// No detailed container logs stored.'}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 3: Full Algorithm Code (Python strategy source preserved at test time) */}
              {inspectorTab === 'code' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-indigo-400 font-semibold">
                        {selectedTest.strategy}.py
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        (Preserved at execution timestamp)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const blob = new Blob([selectedTest.full_algorithm_code], {
                            type: 'text/x-python',
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${selectedTest.strategy}.py`;
                          a.click();
                          showToast(`Downloaded ${selectedTest.strategy}.py`);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Download .py</span>
                      </button>

                      <button
                        onClick={() => copyToClipboard(selectedTest.full_algorithm_code, 'code')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition"
                      >
                        {copiedKey === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Code</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800/90 rounded-xl overflow-x-auto max-h-[520px] overflow-y-auto shadow-inner">
                    <pre
                      style={{
                        fontFamily: 'Consolas, "Courier New", monospace',
                        fontSize: `${fontSize}px`,
                        lineHeight: '1.5',
                      }}
                      className="text-cyan-300 whitespace-pre selection:bg-cyan-500/30 selection:text-white"
                    >
                      {selectedTest.full_algorithm_code || '# No Python strategy code attached to this test.'}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 4: Full Config JSON */}
              {inspectorTab === 'config' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-amber-400 font-semibold">
                      Configuration JSON (Exact execution parameters)
                    </span>

                    <button
                      onClick={() => copyToClipboard(selectedTest.full_config, 'config')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition"
                    >
                      {copiedKey === 'config' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Config JSON</span>
                    </button>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800/90 rounded-xl overflow-x-auto max-h-[520px] overflow-y-auto shadow-inner">
                    <pre
                      style={{
                        fontFamily: 'Consolas, "Courier New", monospace',
                        fontSize: `${fontSize}px`,
                        lineHeight: '1.5',
                      }}
                      className="text-amber-300 whitespace-pre selection:bg-amber-500/30 selection:text-white"
                    >
                      {selectedTest.full_config || '{}'}
                    </pre>
                  </div>
                </div>
              )}

              {/* TAB 5: Side-by-Side Comparator */}
              {inspectorTab === 'compare' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        Compare [{selectedTest.id}] with:
                      </span>
                    </div>

                    <select
                      value={compareTestId || ''}
                      onChange={(e) => setCompareTestId(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {tests
                        .filter((t) => t.id !== selectedTest.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            [{t.id}] {t.testname} ({t.profit_pct >= 0 ? '+' : ''}
                            {t.profit_pct.toFixed(1)}%)
                          </option>
                        ))}
                    </select>
                  </div>

                  {compareTest ? (
                    <div className="space-y-4">
                      {/* Delta Comparison Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Profit Delta */}
                        {(() => {
                          const delta = selectedTest.profit_pct - compareTest.profit_pct;
                          const isBetter = delta >= 0;
                          return (
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                              <span className="text-[10px] uppercase font-mono text-slate-400">Profit Delta</span>
                              <div
                                className={`text-base font-bold font-mono mt-1 ${
                                  isBetter ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {delta >= 0 ? '+' : ''}
                                {delta.toFixed(2)}%
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {selectedTest.profit_pct}% vs {compareTest.profit_pct}%
                              </span>
                            </div>
                          );
                        })()}

                        {/* Drawdown Delta */}
                        {(() => {
                          const delta = selectedTest.drawdown_pct - compareTest.drawdown_pct;
                          const isBetter = delta <= 0; // lower DD is better
                          return (
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                              <span className="text-[10px] uppercase font-mono text-slate-400">Drawdown Delta</span>
                              <div
                                className={`text-base font-bold font-mono mt-1 ${
                                  isBetter ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {delta <= 0 ? '' : '+'}
                                {delta.toFixed(2)}%
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {selectedTest.drawdown_pct}% vs {compareTest.drawdown_pct}%
                              </span>
                            </div>
                          );
                        })()}

                        {/* Win Rate Delta */}
                        {(() => {
                          const delta = selectedTest.win_rate_pct - compareTest.win_rate_pct;
                          const isBetter = delta >= 0;
                          return (
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                              <span className="text-[10px] uppercase font-mono text-slate-400">Win Rate Delta</span>
                              <div
                                className={`text-base font-bold font-mono mt-1 ${
                                  isBetter ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {delta >= 0 ? '+' : ''}
                                {delta.toFixed(1)}%
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {selectedTest.win_rate_pct}% vs {compareTest.win_rate_pct}%
                              </span>
                            </div>
                          );
                        })()}

                        {/* Trades Delta */}
                        {(() => {
                          const delta = selectedTest.total_trades - compareTest.total_trades;
                          return (
                            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                              <span className="text-[10px] uppercase font-mono text-slate-400">Trades Delta</span>
                              <div className="text-base font-bold font-mono text-cyan-400 mt-1">
                                {delta >= 0 ? '+' : ''}
                                {delta}
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {selectedTest.total_trades} vs {compareTest.total_trades}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Side-by-side Table */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                            <span className="text-xs font-mono font-bold text-cyan-400">
                              A: {selectedTest.id}
                            </span>
                            <span className="text-xs text-slate-400">{selectedTest.strategy}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-300 space-y-1">
                            <div>Timerange: {selectedTest.timerange}</div>
                            <div>Timeframes: {selectedTest.timeframe}</div>
                            <div>MOT: {selectedTest.max_open_trades}</div>
                            <div>Total Profit: +{selectedTest.profit_pct}%</div>
                            <div>Drawdown: {selectedTest.drawdown_pct}%</div>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                            <span className="text-xs font-mono font-bold text-amber-400">
                              B: {compareTest.id}
                            </span>
                            <span className="text-xs text-slate-400">{compareTest.strategy}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-300 space-y-1">
                            <div>Timerange: {compareTest.timerange}</div>
                            <div>Timeframes: {compareTest.timeframe}</div>
                            <div>MOT: {compareTest.max_open_trades}</div>
                            <div>Total Profit: +{compareTest.profit_pct}%</div>
                            <div>Drawdown: {compareTest.drawdown_pct}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-xs text-slate-500">
                      Select a secondary test above to begin comparison.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: Notes & Tags Editor */}
              {inspectorTab === 'notes' && (
                <div className="space-y-4">
                  {/* Tags manager */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Tags & Classification
                    </label>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(selectedTest.tags || []).map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300"
                        >
                          <span>{t}</span>
                          <button
                            onClick={() => handleRemoveTag(t)}
                            className="text-slate-500 hover:text-rose-400 text-xs"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Type new tag and press Enter..."
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={handleAddTag}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>

                  {/* Notes Editor */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        Engineer Notes & Observations
                      </label>
                      <button
                        onClick={handleSaveNotes}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Notes</span>
                      </button>
                    </div>

                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={6}
                      placeholder="Enter strategy observations, market conditions, parameter tweaks, candidate status..."
                      className="w-full p-3 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-slate-500">
              Select a test from the left to view results, code, and logs.
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs font-medium rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
