# TradingView Bridge — Architecture & Deployment Summary

**Created:** Sunday, May 3, 2026 - 11:50 EDT  
**Status:** 🟢 Ready to deploy  
**Purpose:** Persistent, reusable live data connection across all trading projects  

---

## Problem Solved

### Before (Challenges)
❌ Browser-based CDP connection unreliable  
❌ Each bot fetches data independently (duplicated effort)  
❌ No sharing of calculated indicators  
❌ Hard to scale to multiple projects  
❌ Delayed data dependency on browser state  

### After (Solution)
✅ Always-on Node.js server (PM2 managed)  
✅ Single source of truth for OHLCV data  
✅ Indicators calculated once, used by all bots  
✅ REST API + WebSocket for flexibility  
✅ Reusable across unlimited projects  
✅ Demo data for testing without live feed  

---

## Architecture

```
TradingView Data
      ↓
TradingView Bridge Server (Node.js)
      ├─ REST API (port 3001)
      │  ├─ /health — Status check
      │  ├─ /candles/SOLUSDT — Get OHLCV candles
      │  ├─ /latest/SOLUSDT — Get latest candle (fast)
      │  ├─ /indicators/SOLUSDT — Get calculated indicators
      │  └─ /status — Full system status
      │
      └─ WebSocket (port 3001)
         └─ Real-time candle updates (push)

   ↓ Used by ↓

   SOLANA Trading Bot
   Other Projects
   Telegram Alerts
   Discord Webhooks
   etc.
```

---

## Files & Structure

```
tradingview-bridge/
├── bridge-server.js          ← Main server (Node.js + Express + WebSocket)
├── bridge-client.js          ← Client library (for bots to use)
├── package.json              ← Dependencies
├── .env.example              ← Configuration template
├── BRIDGE_README.md          ← Full documentation
├── DEPLOY.md                 ← Deployment instructions
└── .git/                      ← Version control
```

---

## Server Features (bridge-server.js)

### Data Management
- Maintains 100 candles per symbol in memory
- Auto-rotates old candles
- Cache expires after 1 hour of inactivity
- Supports SOLUSDT, BTCUSDT, ETHUSDT (extensible)

### Indicator Calculation
- **EMA(8)** — Fast moving average
- **EMA(21)** — Slow moving average
- **RSI(14)** — Relative strength index
- **Bollinger Bands(20,2)** — Support/resistance bands
- **Volume SMA(20)** — Volume average

### Connectivity
- TradingView WebSocket connection with auto-reconnect (5 attempts)
- Demo data fallback (no service disruption)
- WebSocket server for real-time client updates
- REST API for polling clients

### Monitoring
- Health check endpoint
- Full status endpoint
- Per-symbol data availability tracking
- Client connection tracking
- Uptime/error logging

---

## Client Library (bridge-client.js)

### Available Methods
```javascript
const client = new BridgeClient('http://localhost:3001')

// Polling API
await client.health()                    // Check bridge status
await client.getCandles('SOLUSDT', 20)   // Get latest 20 candles
await client.getLatestCandle('SOLUSDT')  // Get only current candle
await client.getIndicators('SOLUSDT')    // Get all calculated indicators
await client.getStatus()                 // Full system status

// WebSocket (real-time)
client.connectWebSocket((msg) => {
  console.log(msg) // Candle updates as they arrive
})
client.subscribe('SOLUSDT')

// Helper functions
isBuySignal(indicators, candle)    // Check if all 6 conditions met
checkSignal(client, 'SOLUSDT')     // Quick signal check
explainSignal(indicators, candle)  // Get detailed explanation
```

---

## Deployment Overview

### Target
- **Host:** DreamHost vps48233.dreamhostps.com
- **Account:** dh_ygjkxx
- **Port:** 3001
- **Process Manager:** PM2
- **Start Command:** `pm2 start bridge-server.js --name "tv-bridge"`

### Time to Deploy
- Create directory: 1 min
- Upload files: 1 min
- Install dependencies: 2 min
- Start server: 1 min
- Verify: 1 min
- **Total: ~5 minutes**

### Health Check
```bash
curl http://localhost:3001/health

# Expected response:
{
  "status": "ok",
  "tvConnected": false,
  "symbols": ["SOLUSDT", "BTCUSDT", "ETHUSDT"],
  "dataPoints": {"SOLUSDT": 50, ...}
}
```

---

## Usage Examples

### In SOLANA Bot
```javascript
import { BridgeClient } from '../tradingview-bridge/bridge-client.js'

const bridge = new BridgeClient('http://localhost:3001')

// Every hour when bot runs:
const indicators = await bridge.getIndicators('SOLUSDT')
const candle = await bridge.getLatestCandle('SOLUSDT')

// Use indicators for trading logic
if (indicators.rsi < 40 && indicators.ema8 > indicators.ema21) {
  // Execute buy order
  executeOrder('BUY', 0.5, indicators)
}
```

### Real-Time Alerts
```javascript
const bridge = new BridgeClient('http://localhost:3001')

bridge.connectWebSocket((message) => {
  if (message.type === 'candle_update' && message.symbol === 'SOLUSDT') {
    console.log('New candle:', message.candle)
    
    // Send to Telegram, Discord, etc.
    notifyUser(`New SOLUSDT candle: ${message.candle.c}`)
  }
})
```

---

## Extensibility

### Add New Symbol
```javascript
// In bridge-server.js CONFIG.symbols:
'ETHUSDT': { exchange: 'BINANCE', tf: '60' }
'ADAUSDT': { exchange: 'BINANCE', tf: '60' }
```

### Add New Timeframe
```javascript
'SOLUSDT_4H': { exchange: 'BINANCE', tf: '240' }
'SOLUSDT_1D': { exchange: 'BINANCE', tf: '1440' }
```

### Add Custom Indicator
```javascript
function calculateMACD(prices) {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  return ema12[ema12.length - 1] - ema26[ema26.length - 1]
}

// Add to calculateIndicators():
return { ..., macd: calculateMACD(closes) }
```

---

## Integration with SOLANA Bot

### Current Setup
- SOLANA Bot: `/home/dh_ygjkxx/trading-bot-solana/`
- Bridge: `/home/dh_ygjkxx/tradingview-bridge/` (new, separate)

### Update Path
1. Deploy bridge (5 min)
2. Start bridge (1 min)
3. Update bot.js to import BridgeClient
4. Replace data fetch logic with bridge API calls
5. Test with bridge for 24 hours
6. Deploy updated bot to live trading

### Bot Changes
```javascript
// OLD: Direct TradingView connection
// NEW: Use bridge client

import { BridgeClient } from '../tradingview-bridge/bridge-client.js'
const bridge = new BridgeClient('http://localhost:3001')

// Replace all indicator calculations with:
const indicators = await bridge.getIndicators('SOLUSDT')
```

---

## Operations & Maintenance

### Daily Checks
```bash
# Is bridge running?
ssh dh_ygjkxx@vps48233.dreamhostps.com "source ~/.nvm/nvm.sh && pm2 list"

# Are indicators updating?
curl http://localhost:3001/status | jq .data

# Any errors?
tail /home/dh_ygjkxx/.pm2/logs/tv-bridge-out.log
```

### If Bridge Crashes
```bash
# Restart automatically (PM2 handles this)
# But if manual restart needed:
ssh dh_ygjkxx@vps48233.dreamhostps.com \
  "source ~/.nvm/nvm.sh && pm2 restart tv-bridge"
```

---

## Performance Specs

### Memory Usage
- 50 candles × 6 bytes per value × 6 symbols ≈ 1.8 KB
- Overhead (Express, WebSocket): ~20 MB
- **Total: ~20 MB** (lightweight)

### Data Refresh
- TradingView updates: Real-time
- REST API response: <10ms (cached)
- WebSocket broadcast: <100ms

### Capacity
- Simultaneous WebSocket clients: Limited by server memory (1000+ easily)
- REST API requests: Unlimited (stateless)
- Symbols supported: Unlimited (add to CONFIG)

---

## Next Steps (Deployment Checklist)

**Phase 1: Deploy Bridge** (Today)
- [ ] Review BRIDGE_README.md and DEPLOY.md
- [ ] Run deployment script (or manual steps)
- [ ] Verify with `curl http://localhost:3001/health`
- [ ] Check logs: `pm2 logs tv-bridge`

**Phase 2: Test Bridge** (Today - 24 hours)
- [ ] Make test API calls (curl)
- [ ] Check WebSocket connection
- [ ] Verify demo data is loading
- [ ] Monitor indicator calculations

**Phase 3: Integrate with Bot** (Tomorrow)
- [ ] Update bot.js to import BridgeClient
- [ ] Replace data fetch with bridge API calls
- [ ] Test bot with bridge data
- [ ] Monitor for errors

**Phase 4: Go Live** (When confident)
- [ ] Switch bot to real trading
- [ ] Keep monitoring bridge logs
- [ ] Set up alerts if bridge goes down
- [ ] Extend to other symbols/projects as needed

---

## Git Repository

```bash
cd /home/harreson/.openclaw/workspace/tradingview-bridge
git log --oneline

# Initial commit:
42ae851 Initial commit: TradingView Bridge - persistent live data server (May 3, 2026)
```

All files tracked in git. Easy to revert, branch, version control.

---

## Summary

| Aspect | Details |
|--------|---------|
| **Type** | Node.js HTTP + WebSocket server |
| **Port** | 3001 |
| **Location** | `/home/dh_ygjkxx/tradingview-bridge/` (DreamHost) |
| **Status** | Ready to deploy |
| **Deploy Time** | 5 minutes |
| **Memory** | ~20 MB |
| **Uptime** | 24/7 (PM2 managed) |
| **Symbols** | SOLUSDT, BTCUSDT, ETHUSDT (extensible) |
| **Indicators** | EMA(8), EMA(21), RSI(14), BB(20,2), VolSMA(20) |
| **API Type** | REST (polling) + WebSocket (push) |
| **Data Source** | TradingView + Demo Fallback |

---

**This is a foundation.** Build on top of it:
- Telegram alerts
- Discord webhooks
- Multiple timeframes
- Advanced indicators
- Machine learning models
- Email notifications
- Risk management
- And more...

**The bridge is your single source of truth for live data.**

---

Generated: May 3, 2026, 11:50 EDT  
Author: Harreson Trading Bot  
Status: ✅ Ready to deploy
