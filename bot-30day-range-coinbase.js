/**
 * Multi-Crypto Trading Bot — 30-Day Range Strategy (v3)
 * 
 * Uses: Coinbase Advanced API SDK (official library)
 * Strategy: Buy in consolidation (lower 30% of 30-day range), sell when range breaks or +9% gained
 * Symbols: ETH, BTC, ATOM, DOGE
 * Execution: Coinbase Advanced API (paper trading mode)
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import pkg from "coinbase";
const { CoinbaseAdvancedAPIClient } = pkg;

// ─── Config ────────────────────────────────────────────────────────────────

const CONFIG = {
  symbols: ["ETH", "BTC", "ATOM", "DOGE"],
  rangeWindow: 30, // days
  buyZonePercentile: 0.30, // lower 30% of range
  sellZonePercentile: 0.70, // upper 70% of range
  gainTarget: 1.09, // +9% profit target
  paperTrading: process.env.PAPER_TRADING !== "false",
  updateInterval: 3600000, // 1 hour
  logFile: "bot-30day-range.log",
  tradesFile: "trades-30day.csv",
};

// Initialize Coinbase client
const client = new CoinbaseAdvancedAPIClient({
  apiKey: process.env.COINBASE_API_KEY,
  privateKey: process.env.COINBASE_PRIVATE_KEY,
  baseUrl: process.env.COINBASE_BASE_URL || "https://api.coinbase.com",
});

// ─── Logging ────────────────────────────────────────────────────────────────

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  appendFileSync(CONFIG.logFile, logEntry + "\n");
}

function initLogs() {
  if (!existsSync(CONFIG.tradesFile)) {
    writeFileSync(
      CONFIG.tradesFile,
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
  appendFileSync(CONFIG.tradesFile, row + "\n");
}

// ─── Fetch 30-Day Candles from Coinbase ────────────────────────────────────

async function fetchCoinbaseCandles(symbol) {
  try {
    // Coinbase product_id format: ETH-USD, BTC-USD, ATOM-USD, DOGE-USD
    const productId = symbol + "-USD";
    
    // Fetch last 720 hours of candles (30 days * 24 hours)
    const candles = await client.getCandles(productId, {
      start: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // 30 days ago
      end: Math.floor(Date.now() / 1000),
      granularity: 3600 // 1 hour
    });

    if (!candles || candles.length === 0) {
      throw new Error(`No candles returned for ${symbol}`);
    }

    return candles.map(([timestamp, low, high, open, close, volume]) => ({
      time: timestamp * 1000,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    }));
  } catch (error) {
    log(`❌ ERROR fetching ${symbol}: ${error.message}`);
    return null;
  }
}

// ─── Get Current Price from Coinbase ────────────────────────────────────────

async function getCurrentPrice(symbol) {
  try {
    const productId = symbol + "-USD";
    const ticker = await client.getTicker(productId);
    
    if (!ticker || !ticker.price) {
      throw new Error(`No price data for ${symbol}`);
    }
    
    return parseFloat(ticker.price);
  } catch (error) {
    log(`❌ ERROR getting price for ${symbol}: ${error.message}`);
    return null;
  }
}

// ─── Calculate 30-Day Ranges ────────────────────────────────────────────────

function calculateRanges(symbol, candles, currentPrice) {
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

  return {
    min30day,
    max30day,
    range,
    buyZoneLow,
    buyZoneHigh,
    sellZoneLow,
    sellZoneHigh,
    positionPercent,
    inBuyZone: currentPrice >= buyZoneLow && currentPrice <= buyZoneHigh,
    inSellZone: currentPrice >= sellZoneLow && currentPrice <= sellZoneHigh,
  };
}

// ─── Check Symbol ──────────────────────────────────────────────────────────

async function checkSymbol(symbol) {
  log(`\n━━━ Checking ${symbol} ━━━`);

  // Get current price
  const currentPrice = await getCurrentPrice(symbol);
  if (!currentPrice) return null;

  log(`💰 Current Price: $${currentPrice.toFixed(2)}`);

  // Fetch 30-day candles
  const candles = await fetchCoinbaseCandles(symbol);
  if (!candles) return null;

  // Calculate ranges
  const ranges = calculateRanges(symbol, candles, currentPrice);

  log(`📊 30-Day Range: $${ranges.min30day.toFixed(2)} — $${ranges.max30day.toFixed(2)}`);
  log(`🟢 Buy Zone: $${ranges.buyZoneLow.toFixed(2)} — $${ranges.buyZoneHigh.toFixed(2)}`);
  log(`🔴 Sell Zone: $${ranges.sellZoneLow.toFixed(2)} — $${ranges.sellZoneHigh.toFixed(2)}`);
  log(`📍 Position: ${ranges.positionPercent.toFixed(2)}% of range`);

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

// ─── Main Loop ──────────────────────────────────────────────────────────────

async function runBot() {
  log("═══════════════════════════════════════════════════════════");
  log("🤖 30-Day Range Trading Bot v3 started");
  log(`📍 Mode: ${CONFIG.paperTrading ? "PAPER TRADING" : "LIVE TRADING"}`);
  log(`⏰ Update interval: ${CONFIG.updateInterval / 1000 / 60} minutes`);
  log(`💾 Data: Coinbase Advanced API (official SDK)`);
  log("═══════════════════════════════════════════════════════════");

  initLogs();

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

// ─── Start ──────────────────────────────────────────────────────────────────

runBot().catch((error) => {
  log(`🔴 FATAL ERROR: ${error.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  log("⛔ Shutting down gracefully...");
  process.exit(0);
});
