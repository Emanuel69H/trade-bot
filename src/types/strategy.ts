export type MarketRegime = 'chop' | 'bear' | 'wick' | 'bull_runner';

export interface Candle {
  timestamp: number;
  dateStr: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Indicators
  adx: number;
  plus_di: number;
  minus_di: number;
  dmi_gap: number;
  atr: number;
  ema20: number;
  ema200: number;
  // Strategy signals
  adx_rising_2: boolean;
  adx_falling_2: boolean;
  bull_breakout: boolean;
  bull_trend: boolean;
  trend_exhausted: boolean;
  pullback_entry: boolean;
}

export type ExitReason =
  | 'stoploss_fixed'
  | 'stoploss_atr'
  | 'adx_falling'
  | 'dmi_inversion'
  | 'roi_time'
  | 'trailing_stop'
  | 'trend_break';

export interface SimulatedTrade {
  id: string;
  entryIndex: number;
  exitIndex: number;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  profitPct: number;
  profitAbs: number;
  exitReason: ExitReason;
  exitReasonLabel: string;
  entryTag: string;
  highWaterMark: number;
  durationCandles: number;
}

export interface StrategyParams {
  adx_trend_threshold: number;
  adx_exhaustion_threshold: number;
  dmi_gap_threshold: number;
  fixed_stoploss: number; // e.g. -0.03
  atr_multiplier: number; // e.g. 2.5
  trailing_activation_pct: number; // e.g. 0.03
  trailing_delta_pct: number; // e.g. 0.015
  use_ema_filter: boolean;
  ema_trend_period: number;
  pullback_tolerance_pct: number;
}

export interface SimulationResult {
  trades: SimulatedTrade[];
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number; // percentage
  profitFactor: number;
  netProfitPct: number;
  maxDrawdownPct: number;
  avgTradePct: number;
  equityCurve: { index: number; equity: number; dateStr: string }[];
}

export interface StrategyFile {
  id: string;
  name: string;
  filename: string;
  description: string;
  language: string;
  category: 'strategy' | 'hyperopt' | 'docker' | 'config' | 'script';
  content: string;
}
