/**
 * Multi-Crypto Trading Bot — 30-Day Range Strategy
 * 
 * Uses: Coinbase Advanced Trade API with JWT Authentication (per CDP documentation)
 * Strategy: Buy in consolidation (lower 30% of 30-day range), sell when range breaks or +9% gained
 * Symbols: ETH, BTC, ATOM, DOGE
 * Execution: Coinbase Advanced API (paper trading mode)
 */

import "dotenv/config";
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// ─── Config ────────────────────────────────────────────────────────────────

const CONFIG = {
  symbols: ["ETH", "BTC", "ATOM", "DOGE"],
  rangeWindow: 30,
  buyZonePercentile: 0.30,
  sellZonePercentile: 0.70,
  gainTarget: 1.09,
  paperTrading: process.env.PAPER_TRADING !== "false",
  updateInterval: 3600000, // 1 hour
  logFile: "bot-30day-range.log",
  tradesFile: "trades-30day.csv",
  apiKey: process.env.COINBASE_API_KEY,
  privateKey: (process.env.COINBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim(),
  baseUrl: "https://api.coinbase.com/api/v3/brokerage",
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

// ─── JWT Generation (per Coinbase documentation) ───────────────────────────

function buildJWT(method, path) {
  const uri = `${method} api.coinbase.com${path}`;
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const payload = {
    iss: 'cdp',
    sub: CONFIG.apiKey,
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120,
    uri: uri,
  };

  const token = jwt.sign(payload, CONFIG.privateKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: CONFIG.apiKey,
      nonce: nonce,
      typ: 'JWT',
    },
  });

  return token;
}

// ─── API Request Helper ──────────────────────────────────────────────────────

async function makeRequest(method, path) {
  try {
    const jwtToken = buildJWT(method, path);
    
    const response = await fetch(CONFIG.baseUrl + path, {
      method: method,
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`API Request (${method} ${path}): ${error.message}`);
  }
}

// ─── Fetch 30-Day Candles ────────────────────────────────────────────────────

async function fetchCandles(symbol) {
  try {
    const productId = symbol + "-USD";
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

    // Coinbase endpoint: GET /products/{product_id}/candles
    const path = `/products/${productId}/candles?start=${thirtyDaysAgo}&end=${now}&granularity=3600`;
    const data = await makeRequest('GET', path);

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`No candles returned`);
    }

    // Coinbase format: [timestamp, low, high, open, close, volume]
    return data.map(([timestamp, low, high, open, close, volume]) => ({
      time: timestamp * 1000,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume),
    }));
  } catch (error) {
    log(`❌ ERROR fetching candles for ${symbol}: ${error.message}`);
    return null;
  }
}

// ─── Get Current Price ───────────────────────────────────────────────────────

async function getCurrentPrice(symbol) {
  try {
    const productId = symbol + "-USD";
    
    // Coinbase endpoint: GET /products/{product_id}
    const path = `/products/${productId}`;
    const data = await makeRequest('GET', path);

    if (!data || !data.price) {
      throw new Error(`No price data`);
    }

    return parseFloat(data.price);
  } catch (error) {
    log(`❌ ERROR getting price for ${symbol}: ${error.message}`);
    return null;
  }
}

// ─── Calculate 30-Day Ranges ────────────────────────────────────────────────

function calculateRanges(symbol, candles, currentPrice) {
  const lows = candles.map(c => c.low);
  const highs = candles.map(c => c.high);

  const min30day = Math.min(...lows);
  const max30day = Math.max(...highs);
  const range = max30day - min30day;

  const buyZoneLow = min30day;
  const buyZoneHigh = min30day + (range * CONFIG.buyZonePercentile);
  const sellZoneLow = min30day + (range * CONFIG.sellZonePercentile);
  const sellZoneHigh = max30day;
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

  const currentPrice = await getCurrentPrice(symbol);
  if (!currentPrice) return null;

  log(`💰 Current Price: $${currentPrice.toFixed(2)}`);

  const candles = await fetchCandles(symbol);
  if (!candles) return null;

  const ranges = calculateRanges(symbol, candles, currentPrice);

  log(`📊 30-Day Range: $${ranges.min30day.toFixed(2)} — $${ranges.max30day.toFixed(2)}`);
  log(`🟢 Buy Zone: $${ranges.buyZoneLow.toFixed(2)} — $${ranges.buyZoneHigh.toFixed(2)}`);
  log(`🔴 Sell Zone: $${ranges.sellZoneLow.toFixed(2)} — $${ranges.sellZoneHigh.toFixed(2)}`);
  log(`📍 Position: ${ranges.positionPercent.toFixed(2)}% of range`);

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
  log("🤖 30-Day Range Trading Bot (Coinbase JWT Auth)");
  log(`📍 Mode: ${CONFIG.paperTrading ? "PAPER TRADING" : "LIVE TRADING"}`);
  log(`⏰ Update interval: ${CONFIG.updateInterval / 1000 / 60} minutes`);
  log(`💾 Data: Coinbase Advanced Trade API (JWT authenticated)`);
  log("═══════════════════════════════════════════════════════════");

  initLogs();

  const runCycle = async () => {
    const cycleTime = new Date().toISOString();
    log(`\n🔄 Cycle: ${cycleTime}`);

    const results = [];
    for (const symbol of CONFIG.symbols) {
      const result = await checkSymbol(symbol);
      if (result) results.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    log(`\n✅ Cycle complete. Next run in ${CONFIG.updateInterval / 1000 / 60} minutes.`);
  };

  await runCycle();
  setInterval(runCycle, CONFIG.updateInterval);
}

// ─── Start ──────────────────────────────────────────────────────────────────

runBot().catch((error) => {
  log(`🔴 FATAL ERROR: ${error.message}`);
  process.exit(1);
});

process.on("SIGINT", () => {
  log("⛔ Shutting down gracefully...");
  process.exit(0);
});
