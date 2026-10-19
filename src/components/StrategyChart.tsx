import React, { useState } from 'react';
import { Candle, SimulatedTrade } from '../types/strategy';

interface StrategyChartProps {
  candles: Candle[];
  trades: SimulatedTrade[];
  strategyTitle: string;
}

export const StrategyChart: React.FC<StrategyChartProps> = ({ candles, trades, strategyTitle }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (candles.length === 0) {
    return <div className="p-8 text-center text-slate-500">No candle data available.</div>;
  }

  // Calculate scales
  const minPrice = Math.min(...candles.map(c => c.low)) * 0.995;
  const maxPrice = Math.max(...candles.map(c => c.high)) * 1.005;
  const priceRange = maxPrice - minPrice || 1;

  const width = 1000;
  const priceChartHeight = 260;
  const indicatorChartHeight = 110;
  const paddingX = 40;
  const paddingY = 15;

  const candleWidth = Math.max(3, (width - paddingX * 2) / candles.length - 2);

  const getX = (index: number) => paddingX + index * ((width - paddingX * 2) / candles.length) + candleWidth / 2;
  const getY = (price: number) => priceChartHeight - paddingY - ((price - minPrice) / priceRange) * (priceChartHeight - paddingY * 2);

  // Indicator Y scale (0 to 60)
  const indMin = 0;
  const indMax = 60;
  const getIndY = (val: number) => indicatorChartHeight - 10 - ((val - indMin) / (indMax - indMin)) * (indicatorChartHeight - 20);

  // Polyline points for EMA 20 and EMA 200
  const ema20Points = candles
    .filter(c => c.ema20 > 0)
    .map((c, i) => `${getX(i)},${getY(c.ema20)}`)
    .join(' ');

  const ema200Points = candles
    .filter(c => c.ema200 > 0)
    .map((c, i) => `${getX(i)},${getY(c.ema200)}`)
    .join(' ');

  // Indicator lines
  const adxPoints = candles.map((c, i) => `${getX(i)},${getIndY(c.adx)}`).join(' ');
  const plusDiPoints = candles.map((c, i) => `${getX(i)},${getIndY(c.plus_di)}`).join(' ');
  const minusDiPoints = candles.map((c, i) => `${getX(i)},${getIndY(c.minus_di)}`).join(' ');

  // Create fast trade lookup maps
  const entryTradeMap = new Map<number, SimulatedTrade>();
  const exitTradeMap = new Map<number, SimulatedTrade>();
  trades.forEach(t => {
    entryTradeMap.set(t.entryIndex, t);
    exitTradeMap.set(t.exitIndex, t);
  });

  const activeCandle = hoveredIndex !== null ? candles[hoveredIndex] : candles[candles.length - 1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Chart Top Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold">{strategyTitle}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Date: <span className="text-slate-200">{activeCandle?.dateStr}</span></span>
          <span className="text-slate-400">O: <span className="text-slate-200 tabular-nums">{activeCandle?.open.toFixed(2)}</span></span>
          <span className="text-slate-400">H: <span className="text-slate-200 tabular-nums">{activeCandle?.high.toFixed(2)}</span></span>
          <span className="text-slate-400">L: <span className="text-slate-200 tabular-nums">{activeCandle?.low.toFixed(2)}</span></span>
          <span className="text-slate-400">C: <span className="text-emerald-400 tabular-nums font-semibold">{activeCandle?.close.toFixed(2)}</span></span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span> EMA20: <span className="tabular-nums">{activeCandle?.ema20.toFixed(2)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span> EMA200: <span className="tabular-nums">{activeCandle?.ema200.toFixed(2)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-200">
            <span className="w-2.5 h-0.5 bg-amber-200 inline-block"></span> ADX: <span className="tabular-nums font-semibold">{activeCandle?.adx.toFixed(1)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span> +DI: <span className="tabular-nums">{activeCandle?.plus_di.toFixed(1)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-0.5 bg-rose-400 inline-block"></span> -DI: <span className="tabular-nums">{activeCandle?.minus_di.toFixed(1)}</span>
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative p-2">
        <svg
          viewBox={`0 0 ${width} ${priceChartHeight + indicatorChartHeight + 10}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Defs for gradients & patterns */}
          <defs>
            <linearGradient id="entryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Grid lines on Price Chart */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
            const priceVal = minPrice + priceRange * ratio;
            const y = getY(priceVal);
            return (
              <g key={i}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                <text x={width - paddingX + 5} y={y + 3} fill="#64748b" fontSize="9" fontFamily="JetBrains Mono">
                  {priceVal.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* EMA 200 & EMA 20 lines */}
          <polyline fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.75" points={ema200Points} />
          <polyline fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.9" points={ema20Points} />

          {/* Candlesticks & Signal Overlays */}
          {candles.map((c, i) => {
            const x = getX(i);
            const isGreen = c.close >= c.open;
            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);
            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(2, Math.abs(openY - closeY));
            const color = isGreen ? '#10b981' : '#f43f5e';

            const entryTrade = entryTradeMap.get(i);
            const exitTrade = exitTradeMap.get(i);

            return (
              <g
                key={i}
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIndex(i)}
              >
                {/* Wick */}
                <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1.2" />
                {/* Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyY}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isGreen ? '#10b981' : '#f43f5e'}
                  rx="0.5"
                />

                {/* Entry Signal Marker */}
                {entryTrade && (
                  <g>
                    <polygon
                      points={`${x},${lowY + 6} ${x - 5},${lowY + 15} ${x + 5},${lowY + 15}`}
                      fill="#10b981"
                    />
                    <text
                      x={x}
                      y={lowY + 25}
                      fill="#34d399"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      BUY
                    </text>
                  </g>
                )}

                {/* Exit Signal Marker */}
                {exitTrade && (
                  <g>
                    <polygon
                      points={`${x},${highY - 6} ${x - 5},${highY - 15} ${x + 5},${highY - 15}`}
                      fill={exitTrade.profitPct >= 0 ? '#38bdf8' : '#f43f5e'}
                    />
                    <text
                      x={x}
                      y={highY - 20}
                      fill={exitTrade.profitPct >= 0 ? '#38bdf8' : '#fb7185'}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      {exitTrade.profitPct >= 0 ? `+${exitTrade.profitPct}%` : `${exitTrade.profitPct}%`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Trade lines connecting entry to exit */}
          {trades.map(t => {
            const x1 = getX(t.entryIndex);
            const y1 = getY(t.entryPrice);
            const x2 = getX(t.exitIndex);
            const y2 = getY(t.exitPrice);
            const isProfit = t.profitPct >= 0;

            return (
              <g key={t.id} opacity="0.6">
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isProfit ? '#10b981' : '#f43f5e'}
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              </g>
            );
          })}

          {/* Divider between Price and Indicator */}
          <line
            x1={paddingX}
            y1={priceChartHeight}
            x2={width - paddingX}
            y2={priceChartHeight}
            stroke="#334155"
            strokeWidth="1"
          />

          {/* Indicator Section Header */}
          <text
            x={paddingX + 4}
            y={priceChartHeight + 14}
            fill="#94a3b8"
            fontSize="10"
            fontFamily="JetBrains Mono"
            fontWeight="bold"
          >
            ADX (14) & DMI Indicator Sub-Chart
          </text>

          {/* ADX Threshold Reference Line (25) */}
          <g transform={`translate(0, ${priceChartHeight})`}>
            <line
              x1={paddingX}
              y1={getIndY(25)}
              x2={width - paddingX}
              y2={getIndY(25)}
              stroke="#fbbf24"
              strokeDasharray="2 2"
              strokeOpacity="0.5"
            />
            <text x={width - paddingX + 5} y={getIndY(25) + 3} fill="#fbbf24" fontSize="8" fontFamily="JetBrains Mono">
              ADX 25
            </text>

            {/* ADX Exhaustion Reference Line (40) */}
            <line
              x1={paddingX}
              y1={getIndY(40)}
              x2={width - paddingX}
              y2={getIndY(40)}
              stroke="#f43f5e"
              strokeDasharray="2 2"
              strokeOpacity="0.4"
            />
            <text x={width - paddingX + 5} y={getIndY(40) + 3} fill="#f43f5e" fontSize="8" fontFamily="JetBrains Mono">
              MAX 40
            </text>

            {/* Indicator Polylines */}
            <polyline fill="none" stroke="#10b981" strokeWidth="1.2" points={plusDiPoints} />
            <polyline fill="none" stroke="#f43f5e" strokeWidth="1.2" points={minusDiPoints} />
            <polyline fill="none" stroke="#fbbf24" strokeWidth="1.8" points={adxPoints} />
          </g>

          {/* Vertical cursor line when hovering */}
          {hoveredIndex !== null && (
            <line
              x1={getX(hoveredIndex)}
              y1={paddingY}
              x2={getX(hoveredIndex)}
              y2={priceChartHeight + indicatorChartHeight}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.7"
            />
          )}
        </svg>
      </div>

      {/* Chart Legend / Footnote */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-sm"></span> Bull Candle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-rose-400 rounded-sm"></span> Bear Candle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-cyan-400 rounded-full"></span> 20 EMA
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-400 rounded-full"></span> 200 EMA
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-amber-300 rounded-full"></span> ADX Line
          </span>
        </div>
        <div className="text-slate-400 font-mono">
          Interactive: Hover candle for precise OHLCV and indicator values
        </div>
      </div>
    </div>
  );
};
