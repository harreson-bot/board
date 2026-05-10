/**
 * Multi-Crypto Trading Bot — 30-Day Range Strategy (v2)
 * 
 * Data source: Google Sheets + Manual price input (since APIs are geo-blocked)
 * Strategy: Buy in consolidation (lower 30% of 30-day range), sell when range breaks or +9% gained
 * Symbols: ETH, BTC, ATOM, DOGE
 * 
 * NOTE: Due to geo-blocking on Binance, we're using:
 * 1. Manual 30-day range input from your Google Sheet (already tracked)
 * 2. Current price from reliable free sources or manual input
 * 3. Logic to determine buy/sell zones based on spreadsheet data
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";

// ─── Config ────────────────────────────────────────────────────────────────

const CONFIG = {
  symbols: ["ETH", "BTC", "ATOM", "DOGE"],
  paperTrading: true,
  updateInterval: 3600000, // 1 hour
  logFile: "bot-30day-range.log",
  tradesFile: "trades-30day.csv",
};

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

// ─── Fetch Current Price from CoinGecko (No geo-blocking) ────────────────────

async function getCurrentPrice(symbol) {
  try {
    const coinMap = {
      ETH: "ethereum",
      BTC: "bitcoin",
      ATOM: "cosmos",
      DOGE: "dogecoin"
    };

    const coinId = coinMap[symbol];
    if (!coinId) throw new Error(`Unknown symbol: ${symbol}`);

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const price = data[coinId]?.usd;
    
    if (!price) throw new Error(`No price data for ${symbol}`);
    
    return price;
  } catch (error) {
    log(`❌ ERROR getting price for ${symbol}: ${error.message}`);
    return null;
  }
}

// ─── Calculate 30-Day Ranges from Spreadsheet Data ───────────────────────────
//
// Your spreadsheet tracks: Min, Max, Buy Zone, Sell Zone
// We'll estimate these from 30-day historical range
// For now, we're using the ranges from your last spreadsheet snapshot

const SPREADSHEET_RANGES = {
  ETH: {
    min30day: 1959.90,
    max30day: 2560.93,
  },
  BTC: {
    min30day: 68300.60,
    max30day: 84678.52,
  },
  ATOM: {
    min30day: 1.7433,
    max30day: 2.0823,
  },
  DOGE: {
    min30day: 0.09119,
    max30day: 0.12110,
  },
};

function calculateRanges(symbol, currentPrice) {
  const ranges = SPREADSHEET_RANGES[symbol];
  if (!ranges) throw new Error(`No range data for ${symbol}`);

  const min30day = ranges.min30day;
  const max30day = ranges.max30day;
  const range = max30day - min30day;

  // Buy zone: lower 30% of range
  const buyZoneLow = min30day;
  const buyZoneHigh = min30day + (range * 0.30);

  // Sell zone: upper 70% of range
  const sellZoneLow = min30day + (range * 0.70);
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

  // Calculate ranges
  const ranges = calculateRanges(symbol, currentPrice);

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
  log("🤖 30-Day Range Trading Bot v2 started");
  log(`📍 Mode: ${CONFIG.paperTrading ? "PAPER TRADING" : "LIVE TRADING"}`);
  log(`⏰ Update interval: ${CONFIG.updateInterval / 1000 / 60} minutes`);
  log(`💾 Data: CoinGecko API (current price) + Spreadsheet ranges (historical)`);
  log("═══════════════════════════════════════════════════════════");

  initLogs();

  const runCycle = async () => {
    const cycleTime = new Date().toISOString();
    log(`\n🔄 Cycle: ${cycleTime}`);

    const results = [];
    for (const symbol of CONFIG.symbols) {
      const result = await checkSymbol(symbol);
      if (result) results.push(result);
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between API calls
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
