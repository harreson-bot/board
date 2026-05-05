# Pine Script Modification Guide - FlowZoneTrader Strategies

**For traders who want to customize their scripts**

---

## Pine Script Basics

### Structure of Our Scripts

Every script has this structure:

```pinescript
//@version=5
strategy("Name", overlay=true, ...)  // Header

// ---- INPUTS ----
variable = input.int(default, title="Label", group="Group")

// ---- CALCULATIONS ----
emaFast = ta.ema(close, length)

// ---- ENTRY SIGNALS ----
buySignal = condition1 and condition2

// ---- STRATEGY LOGIC ----
if buySignal
    strategy.entry("Long", strategy.long)

// ---- VISUAL INDICATORS ----
plot(emaFast, color=color.blue)

// ---- ALERTS ----
alertcondition(buySignal, title="Buy")
```

### Common Modifications

---

## Strategy #1 (ORB) - Common Tweaks

### Modify: Change ORB Window Size
**Current:**
```pinescript
orbMinutes = input.int(30, title="ORB Window (minutes)")
```

**To use 15-minute ORB instead:**
```pinescript
orbMinutes = input.int(15, title="ORB Window (minutes)")
```

**Effect:** Tighter opening range = fewer false breaks, fewer trades

---

### Modify: Add Volume Confirmation
**Add this to INPUTS section:**
```pinescript
minVolume = input.int(50000, title="Min Volume to Trade", group="Risk Settings")
```

**Add this to ENTRY SIGNALS section:**
```pinescript
volumeConfirmed = volume > minVolume
```

**Change entry condition from:**
```pinescript
if buySignal and strategy.position_size == 0
```

**To:**
```pinescript
if buySignal and volumeConfirmed and strategy.position_size == 0
```

**Effect:** Only trades breakouts with above-average volume (filters out weak breaks)

---

### Modify: Dynamic Stop Loss (ATR-based)
**Replace fixed stop:**
```pinescript
riskPips = input.int(10, title="Stop Loss (pips)")
```

**With dynamic stop:**
```pinescript
atrLength = input.int(14, title="ATR Length", group="Risk Settings")
atrMultiplier = input.float(1.0, title="ATR Multiplier", minval=0.5, maxval=3.0, group="Risk Settings")
dynamicStop = atr(atrLength) * atrMultiplier
```

**In strategy entry:**
```pinescript
stopLoss = close - dynamicStop  // For buys
stopLoss = close + dynamicStop  // For sells
```

**Effect:** Stops adjust to volatility (wider stops in volatile markets)

---

### Modify: Add Trailing Stop
**Replace standard exit with trailing stop:**

**Old:**
```pinescript
strategy.exit("TP1", "Long ORB", limit=takeProfit1, stop=stopLoss)
```

**New:**
```pinescript
strategy.exit("TP1", "Long ORB", limit=takeProfit1, stop=stopLoss, trail_points=trailPips)
```

**Add to INPUTS:**
```pinescript
trailPips = input.int(5, title="Trailing Stop (pips)", group="Risk Settings")
```

**Effect:** Profit-locking stop that trails price as it moves (captures bigger winners)

---

### Modify: Only Trade First Breakout of Day
**Add to CALCULATIONS:**
```pinescript
var bool firstBreakoutDone = false

if barstate.islast and hour(time) == 9 and minute(time) == 30
    firstBreakoutDone := false
```

**Change buy condition to:**
```pinescript
buySignal = bullishBreakout and not firstBreakoutDone
sellSignal = bearishBreakout and not firstBreakoutDone

if buySignal or sellSignal
    firstBreakoutDone := true
```

**Effect:** Only takes 1 trade per day (highest-probability setup)

---

## Strategy #2 (Liquidity Grab) - Common Tweaks

### Modify: Show Previous Day's Levels
**Add to CALCULATIONS:**
```pinescript
prevDayHigh = ta.highest(high, 260)  // 260 candles = roughly 1 day on 15M
prevDayLow = ta.lowest(low, 260)
```

**Add to VISUAL section:**
```pinescript
hline(prevDayHigh, "Prev Day High", color=color.new(color.blue, 70), linestyle=hline.style_dashed)
hline(prevDayLow, "Prev Day Low", color=color.new(color.blue, 70), linestyle=hline.style_dashed)
```

**Effect:** Identifies previous day as natural liquidity zone (often targeted)

---

### Modify: Add Round Number Levels
**Add to INPUTS:**
```pinescript
showRoundNumbers = input.bool(true, title="Show Round Numbers", group="Display Settings")
```

**Add to CALCULATIONS:**
```pinescript
roundNumber = math.round(close / 100) * 100  // For NQ: 5100, 5200, 5300
```

**Add to VISUAL section:**
```pinescript
if showRoundNumbers
    hline(roundNumber, "Round Number", color=color.new(color.purple, 60), linestyle=hline.style_dotted)
```

**Effect:** Highlights round numbers (psychological resistance/support)

---

### Modify: Filter by Market Regime
**Add to CALCULATIONS:**
```pinescript
// Only trade if we're in an uptrend (higher highs/higher lows)
trendingUp = close > ta.highest(close, 50)
trendingDown = close < ta.lowest(close, 50)
```

**Change buy condition to:**
```pinescript
buySignal = orderBlockFormed and bullishEMA and trendingUp  // Only buy in uptrend
sellSignal = orderBlockFormed and bearishEMA and trendingDown  // Only sell in downtrend
```

**Effect:** Fewer counter-trend trades = higher win rate

---

### Modify: Require Volume Confirmation
**Add to INPUTS:**
```pinescript
minVolumeLevel = input.float(1.5, title="Min Volume Multiplier", minval=1.0, maxval=3.0, group="Risk Settings")
```

**Add to CALCULATIONS:**
```pinescript
avgVol = ta.sma(volume, 20)
volumeHigh = volume > avgVol * minVolumeLevel
```

**Change buy/sell condition to:**
```pinescript
buySignal = orderBlockFormed and bullishEMA and volumeHigh  // Requires volume
```

**Effect:** Only trades with institutional volume (reduces false signals)

---

## Strategy #3 (Footprint Scalp) - Common Tweaks

### Modify: Detect Institutional Orders (Large Volume Single Prints)
**Add to CALCULATIONS:**
```pinescript
volumePercandle = volume / bar_index  // Rough estimate of order concentration
isLargeOrderDetected = volumePercandle > ta.sma(volumePercandle, 20) * 2
```

**Use in entry condition:**
```pinescript
buySignal = volumeSpikeBuy and isLargeOrderDetected  // Requires large order
```

**Effect:** Filters out retail noise, catches institutional order flow

---

### Modify: Add Bid/Ask Spread Awareness
**Add to INPUTS:**
```pinescript
symbolSpread = input.float(0.25, title="Expected Spread (pips)", group="Risk Settings")
```

**Adjust targets to account for spread:**
```pinescript
takeProfit1 = close + (target1Pips * syminfo.mintick) + (symbolSpread * syminfo.mintick)
```

**Effect:** Ensures target is above expected spread (realistic profit targets)

---

### Modify: Only Scalp During High Volume Hours
**Add to CALCULATIONS:**
```pinescript
peakVolumeHour1 = currentHourEDT >= 9 and currentHourEDT < 11  // 9:30-11:00
peakVolumeHour2 = currentHourEDT >= 13 and currentHourEDT < 14  // 1:00-2:00
isPeakVolume = peakVolumeHour1 or peakVolumeHour2
```

**Change entry condition to:**
```pinescript
buySignal = volumeSpikeBuy and isPeakVolume  // Only scalp peak hours
```

**Effect:** Higher win rate (better signals during peak volume)

---

### Modify: Increase Minimum Consolidation
**Add to INPUTS:**
```pinescript
minConsolidationBars = input.int(3, title="Min Consolidation Candles", minval=2, maxval=10, group="Momentum Settings")
```

**Change consolidation detection to:**
```pinescript
if isConsolidation and bar_index - consolidationBar >= minConsolidationBars
    // Ready to trade
```

**Effect:** Requires longer consolidation = bigger momentum release when break happens

---

### Modify: Add Multi-Timeframe Confirmation
**Add to SCRIPT (requires second script on higher TF):**
```pinescript
// This is advanced: import higher TF bias via global variable
// Works if you run 5M scalp script + 15M bias script together
higherTFBullish = input.bool(true, title="Require Higher TF Bullish", group="MTF Settings")

buySignal = volumeSpikeBuy and (not higherTFBullish or emaBullish)
```

**Effect:** Only scalps in direction of higher timeframe trend

---

## Global Modifications (All Strategies)

### Modify: Change Position Sizing
**All scripts use this:**
```pinescript
strategy("Name", default_qty_type=strategy.percent_of_equity, default_qty_value=1)
```

**To risk fixed amount per trade instead:**
```pinescript
riskAmount = input.float(100, title="Risk $ per Trade", group="Risk Settings")
positionSize = riskAmount / (riskPips * syminfo.mintick)
strategy.entry("Buy", strategy.long, qty=positionSize)
```

**Effect:** Scales position size based on account size (better risk management)

---

### Modify: Add Trade Counter
**Add to CALCULATIONS:**
```pinescript
var int tradeCount = 0

if strategy.position_size != strategy.position_size[1]
    if strategy.position_size != 0
        tradeCount += 1
```

**Add to TABLE or VISUAL:**
```pinescript
plot(tradeCount, title="Trades Today", style=plot.style_label)
```

**Effect:** Tracks number of trades (know when you've hit your daily limit)

---

### Modify: Add Equity Tracking
**Add to VISUAL:**
```pinescript
strategy.equity  // Built-in variable showing account equity
plot(strategy.equity, title="Equity Curve", color=color.green, style=plot.style_line)
```

**Effect:** See profit/loss in real-time on chart

---

### Modify: Add Time-Based Exit (Max Hold Time)
**Add to STRATEGY LOGIC:**
```pinescript
maxHoldMinutes = input.int(30, title="Max Hold Time (minutes)", group="Risk Settings")
entryTime = strategy.opentrades.entry_time(0)
holdTime = (time - entryTime) / 1000 / 60  // Convert to minutes

if holdTime > maxHoldMinutes and strategy.position_size != 0
    strategy.close_all()  // Exit after max time
```

**Effect:** Closes trades that haven't hit targets (prevents overnight holds)

---

## Debugging Tips

### Add Debug Prints
**To understand what the script is doing:**

```pinescript
if barstate.islast
    log.info(str.format("EMA Fast: {0}, EMA Slow: {1}", emaFast, emaSlow))
    log.info(str.format("Buy Signal: {0}, Sell Signal: {1}", buySignal, sellSignal))
```

**View in:** Strategy Tester → Logs tab

**Effect:** See exactly what conditions triggered (debugging)

---

### Verify Signal Timing
**Add chart labels:**

```pinescript
if buySignal
    label.new(bar_index, high, "BUY", color=color.green, textcolor=color.white)

if sellSignal
    label.new(bar_index, low, "SELL", color=color.red, textcolor=color.white)
```

**Effect:** Visually confirms signals are where you expect them

---

## Common Errors & Fixes

### Error: "Compilation Failed"
**Solution:** Check for:
- Typos in variable names
- Missing commas in function calls
- Unmatched parentheses/brackets
- Using old Pine v4 syntax (we use v5)

---

### Error: "Variable Already Defined"
**Solution:** You're declaring the same variable twice
- Check INPUTS section for duplicates
- Use unique variable names

---

### Error: "Function Not Recognized"
**Solution:** Function doesn't exist in Pine Script
- Use `ta.ema()` (not `ema()`)
- Use `ta.highest()` (not `highest()`)
- Refer to Pine Script documentation for correct names

---

### Script Runs But No Signals
**Solution:**
1. Check if date range is before signals form (scroll forward in time)
2. Verify indicators are calculating (plot EMAs to see if they're there)
3. Check if conditions are too strict (increase tolerance)
4. Add debug prints to see if conditions are true/false

---

## Performance Tuning

### Script Runs Slow on Historical Data
**Optimize by:**
1. Removing unnecessary plots/labels
2. Using `if barstate.islast` to calculate only on last bar
3. Reducing lookback periods (20 instead of 50)
4. Avoiding `request.security()` on multiple timeframes

### Strategy Tester Hangs
**Solution:**
1. Reduce backtest date range (test 1 week instead of 1 year)
2. Disable pyramiding (prevent opening multiple positions)
3. Reduce commission/slippage in strategy settings
4. Simplify entry conditions

---

## Advanced Customizations

### Multi-Strategy Portfolio (Run All 3 Together)
**Advanced users can:**
1. Create wrapper script that imports all 3
2. Allocate 33% risk to each strategy
3. Scale position size based on win rate
4. Manage correlated risks

This requires Pine Script v5 ability + strategy libraries.

---

### Machine Learning Integration (Future)
**Planned for enhancement:**
- Use past price data to predict next candle bias
- Weight signals based on recent win rate
- Dynamically adjust targets based on volatility

(Requires external data feeds, not native Pine)

---

## Resources

### Pine Script Documentation
- Official: https://www.tradingview.com/pine-script-docs/
- Community: https://www.tradingview.com/script/

### Testing Strategies
- TradingView Strategy Tester built-in
- Paper trading first (0 risk, real signals)
- Backtest multiple date ranges (avoid overfitting)

### Getting Help
- Post on TradingView forum with error + code snippet
- Check existing scripts for similar functionality
- Ask in Discord communities (FlowZoneTrader, trading groups)

---

## Final Notes

**Before deploying modified scripts:**

1. ✅ Test on paper trading (1 week, min 20 trades)
2. ✅ Run backtest on multiple date ranges
3. ✅ Verify win rate >= 70%
4. ✅ Check profit factor >= 2.0
5. ✅ Ensure stops are tight (5-10 pips max)
6. ✅ Document all changes (why you made them)
7. ✅ Trade small position size initially (1 contract)
8. ✅ Monitor first 5 live trades closely

**When in doubt, keep it simple.** The original strategies have proven rules. Modifications should only make them stronger, not more complex.

Good luck with your modifications! 🚀
