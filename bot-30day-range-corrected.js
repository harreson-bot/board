/**
 * Multi-Crypto Trading Bot — 30-Day Range Strategy
 * 
 * Strategy: Buy in consolidation (lower 30% of 30-day range), sell when range breaks or +9% gained
 * Symbols: ETH, BTC, ATOM, DOGE
 * Data source: Coinbase API (hourly candles)
 * Execution: Coinbase Advanced API (paper trading mode)
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";

// ─── Config ────────────────────────────────────────────────────────────────

const CONFIG = {
  symbols: ["ETHUSDT", "BTCUSDT", "ATOMUSDT", "DOGEUSDT"],
  rangeWindow: 30, // days
  buyZonePercentile: 0.30, // lower 30% of range
  sellZonePercentile: 0.70, // upper 70% of range
  gainTarget: 1.09, // +9% profit target
  paperTrading: true,
  updateInterval: 3600000, // 1 hour (3,600,000 ms)
  coinbaseApiUrl: "https://api.coinbase.com/api/v3",
  googleSheetId: process.env.GOOGLE_SHEET_ID,
  googleServiceAccount: process.env.GOOGLE_SERVICE_ACCOUNT,
};

const LOG_FILE = "bot-30day-range.log";
const TRADES_FILE = "trades-30day.csv";

// ─── Logging ────────────────────────────────────────────────────────────────

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  appendFileSync(LOG_FILE, logEntry + "\n");
}

function initTradeLogs() {
  if (!existsSync(TRADES_FILE)) {
    writeFileSync(
      TRADES_FILE,
      "DateTime,Symbol,Price,Buy_Zone_Low,Buy_Zone_High,Sell_Zone_Low,Sell_Zone_High,Position_Percent,Action,Reason\n"
    );
  }
}

function recordTrade(symbol, price, ranges, positionPercent, action, reason) {
  const timestamp = new Date().toISOString();
  const row = [
    timestamp,
    symbol,
    price.toFixed(2),
    ranges.buyZoneLow.toFixed(2),
    ranges.buyZoneHigh.toFixed(2),
    ranges.sellZoneLow.toFixed(2),
    ranges.sellZoneHigh.toFixed(2),
    positionPercent.toFixed(2),
    action,
    reason
  ].join(",");
  appendFileSync(TRADES_FILE, row + "\n");
}

// ─── Fetch 30-Day Candles from Binance (Free, Public API) ────────────────────

async function fetchCoinbaseCandles(symbol) {
  try {
    // Binance timeframe mapping: 1h = 1 hour candles
    // For 30 days of hourly candles: 30 * 24 = 720 candles
    const limit = 720; // 30 days * 24 hours = 720 hourly candles
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
    }

    const candles = await response.json();
    if (!Array.isArray(candles) || candles.length === 0) {
      throw new Error(`No candles returned for ${symbol}`);
    }

    // Binance format: [open_time, open, high, low, close, volume, close_time, ...]
    return candles.map(([openTime, open, high, low, close, volume]) => ({
      time: openTime,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    }));
  } catch (error) {
    log(`ERROR fetching ${symbol}: ${error.message}`);
    return null;
  }
}

// ─── Calculate 30-Day Range ────────────────────────────────────────────────

function calculateRanges(candles, currentPrice) {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  const min30day = Math.min(...lows);
  const max30day = Math.max(...highs);
  const range = max30day - min30day;

  // Buy zone: lower 30% of range
  const buyZoneLow = min30day;
  const buyZoneHigh = min30day + (range * CONFIG.buyZonePercentile);

  // Sell zone: upper 70% of range
  const sellZoneLow = min30day + (range * CONFIG.sellZonePercentile);
  const sellZoneHigh = max30day;

  // Position in range (0% = at low, 100% = at high)
  const positionPercent = ((currentPrice - min30day) / range) * 100;

  // Gain target (entry + 9%)
  const gainTarget = currentPrice * CONFIG.gainTarget;

  return {
    min30day,
    max30day,
    range,
    buyZoneLow,
    buyZoneHigh,
    sellZoneLow,
    sellZoneHigh,
    positionPercent,
    gainTarget,
    inBuyZone: currentPrice >= buyZoneLow && currentPrice <= buyZoneHigh,
    inSellZone: currentPrice >= sellZoneLow && currentPrice <= sellZoneHigh,
  };
}

// ─── Get Current Price (Binance) ────────────────────────────────────────

async function getCurrentPrice(symbol) {
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    log(`ERROR getting price for ${symbol}: ${error.message}`);
    return null;
  }
}

// ─── Trade Logic ────────────────────────────────────────────────────────────

async function checkSymbol(symbol) {
  log(`\n━━━ Checking ${symbol} ━━━`);

  // Get current price
  const currentPrice = await getCurrentPrice(symbol);
  if (!currentPrice) return null;

  log(`Current Price: $${currentPrice.toFixed(2)}`);

  // Fetch 30-day candles
  const candles = await fetchCoinbaseCandles(symbol);
  if (!candles) return null;

  // Calculate ranges
  const ranges = calculateRanges(candles, currentPrice);

  log(`30-Day Range: $${ranges.min30day.toFixed(2)} — $${ranges.max30day.toFixed(2)}`);
  log(`Buy Zone: $${ranges.buyZoneLow.toFixed(2)} — $${ranges.buyZoneHigh.toFixed(2)}`);
  log(`Sell Zone: $${ranges.sellZoneLow.toFixed(2)} — $${ranges.sellZoneHigh.toFixed(2)}`);
  log(`Position: ${ranges.positionPercent.toFixed(2)}% of range`);

  // Determine action
  let action = "HOLD";
  let reason = "Waiting for entry/exit";

  if (ranges.inBuyZone) {
    action = "BUY";
    reason = `Price in buy zone (${ranges.positionPercent.toFixed(2)}% of range)`;
    log(`✅ BUY SIGNAL: ${reason}`);
    recordTrade(symbol, currentPrice, ranges, ranges.positionPercent, action, reason);
  } else if (ranges.inSellZone) {
    action = "SELL";
    reason = `Price in sell zone (${ranges.positionPercent.toFixed(2)}% of range)`;
    log(`✅ SELL SIGNAL: ${reason}`);
    recordTrade(symbol, currentPrice, ranges, ranges.positionPercent, action, reason);
  } else {
    log(`⏳ HOLD: Not in buy or sell zone`);
    recordTrade(symbol, currentPrice, ranges, ranges.positionPercent, action, reason);
  }

  return { symbol, currentPrice, ranges, action, reason };
}

// ─── Main Loop ────────────────────────────────────────────────────────────

async function runBot() {
  log("═══════════════════════════════════════════════════════════");
  log("30-Day Range Trading Bot started");
  log(`Mode: ${CONFIG.paperTrading ? "PAPER TRADING" : "LIVE TRADING"}`);
  log(`Update interval: ${CONFIG.updateInterval / 1000 / 60} minutes`);
  log("═══════════════════════════════════════════════════════════");

  initTradeLogs();

  const runCycle = async () => {
    const cycleTime = new Date().toISOString();
    log(`\n🔄 Cycle: ${cycleTime}`);

    const results = [];
    for (const symbol of CONFIG.symbols) {
      const result = await checkSymbol(symbol);
      if (result) results.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay between API calls
    }

    log(`\n✅ Cycle complete. Next run in ${CONFIG.updateInterval / 1000 / 60} minutes.`);
  };

  // Run immediately on startup
  await runCycle();

  // Then run on interval
  setInterval(runCycle, CONFIG.updateInterval);
}

// ─── Start Bot ────────────────────────────────────────────────────────────

runBot().catch((error) => {
  log(`FATAL ERROR: ${error.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  log("Shutting down gracefully...");
  process.exit(0);
});
