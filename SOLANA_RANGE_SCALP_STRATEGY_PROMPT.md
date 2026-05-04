# SOLANA Range Scalping Strategy — Claude Code Setup Prompt

**Copy everything below and paste into Claude Code to configure the bot.**

---

## Strategy Overview

Build a SOLANA (SOLUSDT) range scalping bot with these specifications:

**Objective:** Capitalize on SOLANA's $80-90 range by buying dips and selling rallies within a defined window.

**Historical Context:** Since February 2026, SOLANA has moved from $80 → $90 approximately 4 times. Each move represents a 6-12% profit opportunity. The goal is to catch these moves repeatedly using a tight price-based strategy.

**Why This Works:** 
- SOLANA oscillates predictably in this range
- No complex indicator analysis required — pure price action
- Simple entry/exit rules = fewer false signals
- High probability setups within the $80-82 buy zone

---

## Trading Rules

### Entry Rule (BUY)
- **Condition:** Price is between $80.00 and $82.00 USD
- **Quantity:** $1,000 USD worth of SOLANA (full portfolio per trade)
- **Logic:** When price dips into the $80-82 zone, enter immediately. This is the low end of the range.

### Exit Rule (SELL)
- **Condition:** Price is between $85.00 and $87.00 USD
- **Quantity:** Exit the full position (100% of holdings)
- **Logic:** When price rallies into the $85-87 zone, sell the entire position. Lock in 6% profit minimum.

### Position Management
- **Position Size:** $1,000 per trade (use 100% of portfolio each time)
- **Stop Loss:** NONE — willing to hold if price doesn't hit the $85-87 sell zone
- **Time Limit:** No time-based exit; only exit when price hits the $85-87 zone
- **Re-entry:** After selling, wait for price to dip back below $83 before entering again

### Risk Guardrails (Safety)
- **Max Trade Size:** $1,000 USD (hard limit per rules.json)
- **Max Trades Per Day:** 3 (prevents over-trading)
- **Daily Profit Cap:** $10,000 (if exceeded, stop trading for the day)

---

## Rules.json Format

Use this exact rules.json structure for the bot:

```json
{
  "symbol": "SOLUSDT",
  "timeframe": "1H",
  "strategy": "SOLANA_RANGE_SCALP",
  "description": "Buy SOLANA between $80-82, sell between $85-87",
  
  "entry_rules": [
    {
      "name": "Price in buy zone",
      "condition": "price >= 80 AND price <= 82",
      "required": true
    }
  ],
  
  "exit_rules": [
    {
      "name": "Price in sell zone",
      "condition": "price >= 85 AND price <= 87",
      "required": true
    }
  ],
  
  "position_management": {
    "position_size_usd": 1000,
    "max_position_size_usd": 1000,
    "stop_loss_percent": null,
    "no_stop_loss": true,
    "hold_until_exit_zone": true,
    "max_daily_trades": 3
  },
  
  "risk_management": {
    "max_trade_size_usd": 1000,
    "max_trades_per_day": 3,
    "daily_profit_cap_usd": 10000,
    "position_sizing": "fixed",
    "portfolio_risk_percent": 100
  }
}
```

---

## Expected Behavior

### When Price is $80-82 (Buy Zone)
Bot logs: "ENTRY CONDITION MET — Price in buy zone ($80-82)"
Bot action: BUY $1,000 worth of SOLANA
Log: Safety check passed. Entry executed.

### While Holding (Price $82-85)
Bot logs: "HOLDING — Waiting for exit zone ($85-87)"
Bot action: No action. Continue monitoring.

### When Price is $85-87 (Sell Zone)
Bot logs: "EXIT CONDITION MET — Price in sell zone ($85-87)"
Bot action: SELL entire SOLANA position
Log: Trade complete. Profit recorded to trades.csv

### After Exit
Bot logs: "Position closed. Available for re-entry when price < $83"
Bot waits for price to dip back into buy zone.

---

## Configuration Variables

For .env file:

```
PORTFOLIO_VALUE_USD=1000
MAX_TRADE_SIZE_USD=1000
MAX_TRADES_PER_DAY=3
PAPER_TRADING=true
SYMBOL=SOLUSDT
TIMEFRAME=1H
```

---

## Testing & Deployment

1. **Paper Trading Mode:** PAPER_TRADING=true
   - Run the bot on historical data
   - Watch for entries between $80-82 and exits between $85-87
   - Verify it would have caught the 4 moves since February 2026

2. **Backtest Verification:**
   - Check if the bot would have entered 4 times since February
   - Each entry at ~$80-82, each exit at ~$85-87
   - Expected profit per cycle: 6-8% per trade × 4 occurrences = 24-32% total

3. **Go Live When Confident:**
   - PAPER_TRADING=false
   - Monitor first 3 trades in live mode
   - Verify bot enters at $80-82 and exits at $85-87

---

## Additional Notes

- **No stop loss:** This is intentional. SOLANA holding above $80 is acceptable. You're waiting for the rally into $85-87.
- **Full capital allocation:** Using $1,000 per trade means you only hold one position at a time. When you exit at $85-87, capital is available for the next buy.
- **High conviction setup:** Since Feb 2026, SOLANA has done this move ~4 times. The odds are in your favor.
- **Simplicity:** Only 1 entry condition (price zone) + 1 exit condition (price zone). No RSI, EMA, or volume analysis needed.

---

## Prompt for Claude Code

**Paste the rules.json above into your bot's rules.json file, then run:**

```
node bot.js
```

The bot will:
1. Check if current price is in the buy zone ($80-82)
2. If yes → Execute BUY order
3. Monitor for sell zone ($85-87)
4. If hit → Execute SELL and log profit
5. Wait for re-entry opportunity

---

**Ready to go. No YouTube transcripts needed. No indicator extraction. Pure range-based scalping.**
