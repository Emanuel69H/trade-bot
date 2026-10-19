export interface TestRecord {
  id: string;
  testname: string;
  timestamp: string;
  strategy: string;
  timeframe: string;
  timerange: string;
  max_open_trades: string;
  pairs: string[];
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  short_result: string;
  long_result: string;
  full_algorithm_code: string;
  full_config: string;
  profit_pct: number;
  drawdown_pct: number;
  win_rate_pct: number;
  total_trades: number;
  final_balance?: number;
  duration_seconds?: number;
  tags: string[];
  notes?: string;
  favorite?: boolean;
}
