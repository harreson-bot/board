# FlowZoneTrader Strategies - Quick Reference Cheat Sheet

## STRATEGY #1: Opening Range Breakout (ORB) + Order Flow

**When:** 9:30-10:30 EDT ONLY
**Timeframe:** 5M or 15M
**Win Rate:** 70-85%

```
1. Mark opening range HIGH/LOW (first 5-30 min)
2. Wait for breakout + confirmation candle
3. Check: Footprint has BUY > SELL (or reverse for sells)
4. Check: EMA(9) above EMA(21) for buys (below for sells)

BUY:  Entry above range high + footprint bullish
      Stop: 10 pips below range low
      T1: +10-15 pips
      T2: +20-30 pips
```

---

## STRATEGY #2: Liquidity Grab + Order Block

**When:** Any time, stronger 9:30-12:00 EDT and 1:00-3:00 EDT
**Timeframe:** 15M or 1H
**Win Rate:** 70-75% | Risk/Reward: 1:3 to 1:10

```
1. Mark previous day/week highs/lows (liquidity zones)
2. Wait for price to GRAB above/below with wick
3. Price reverses back inside (order block forms)
4. Retest order block = ENTRY

CALC: Malaysian SnR
R-level = High + (High - Low)
S-level = Low - (High - Low)

BUY: Wick above high → reverses → retest order block
     Stop: 5 pips below order block
     T1: +15-20 pips
     T2: +30-50 pips (Malaysian R-level)
```

---

## STRATEGY #3: Footprint Momentum Scalp

**When:** 9:30-3:00 EDT (peak volume hours)
**Timeframe:** 1M or 3M footprint
**Win Rate:** 75-85% | Time per trade: 2-10 min

```
1. Watch for 2-3 consecutive candles: BUY > SELL (or reverse)
2. Volume INCREASING each candle (consolidation)
3. Next candle: Volume spike + price breaks consolidation
4. ENTRY: When spike detected

SCALP:
Entry: Right at volume spike break
Stop: 5 pips from consolidation extreme
T1: +8-10 pips (sell 50%)
T2: +12-15 pips (trail remaining 50% with 3-pip stop)
Max hold: 10 minutes
```

---

## MULTIFRAME BIAS ALIGNMENT (Before Every Trade)

```
Level 1 (4H/Daily): EMA(9) above/below EMA(21)?
Level 2 (1H):       Higher highs/lows OR lower highs/lows?
Level 3 (5M/15M):   Is setup in direction of Levels 1 & 2?

✅ Trade if ALL align = 90% confidence
❌ Skip if any conflicts = too risky
```

---

## DAILY ROUTINE

**9:25 EDT:**
- [ ] Check 4H/Daily bias (EMA, trend)
- [ ] Mark previous day high/low
- [ ] Calculate Malaysian SnR for the day
- [ ] Identify round number resistance/support

**9:30 EDT:**
- [ ] Watch opening range form (5-30 min)
- [ ] Mark ORB high and low

**9:35-10:30 EDT:**
- [ ] Trade ORB setups (highest probability time)
- [ ] Confirm with footprint order flow

**10:30-3:00 EDT:**
- [ ] Trade Liquidity Grab setups (order blocks)
- [ ] Trade Footprint Momentum scalps (during high volume)
- [ ] Avoid 11:00-12:00 (data risk)

**After 3:00 EDT:**
- [ ] Stop trading (volume drops, spreads widen)
- [ ] Review trades from the day
- [ ] Update journal

---

## RISK MANAGEMENT (NON-NEGOTIABLE)

| Rule | Details |
|------|---------|
| **Risk per trade** | 0.5-1% of account ($50-100 on $10k) |
| **Stop loss** | 5-10 pips MAX (not 50) |
| **Max loss/day** | 2 losses in a row → STOP TRADING |
| **Hold time** | ORB: 5-30 min | LG: 30-60 min | Scalp: 2-10 min |
| **Account equity** | Min $10k recommended (scalability) |

---

## FOOTPRINT READING QUICK GUIDE

| Signal | Meaning | Action |
|--------|---------|--------|
| BUY > SELL volume | Buyers accumulating | BULLISH BIAS |
| SELL > BUY volume | Sellers accumulating | BEARISH BIAS |
| Large single print (LSP) | Institutional order | Confirm with trend |
| Absorption | Buyers/sellers absorbing opposite side | STRONG trend sign |
| Volume cluster | Heavy volume at specific price | Resistance/support forming |

---

## RED FLAGS (SKIP THE TRADE)

❌ Footprint doesn't match price action (order flow says no, price wants to go)
❌ Setup is counter to 4H bias (fighting the daily trend)
❌ Volume is LOW (spreads wide, stops hit easily)
❌ After 3:00 PM (liquidity dries up)
❌ Within 30 min of FOMC data (unpredictable)
❌ More than 2 losses in a row (emotions rising)

---

## WEEKLY CHECKLIST

**Every Friday after market close:**
- [ ] Count wins vs losses (target: 70%+)
- [ ] Calculate average profit per trade
- [ ] Review largest winners (what did you do right?)
- [ ] Review largest losers (what went wrong?)
- [ ] Identify 1 adjustment for next week
- [ ] Update trading journal

---

## EQUIPMENT CHECKLIST

**Essential:**
- [ ] TradingView Pro ($15/month) — footprints required
- [ ] Futures broker account (Lightspeed, TD, SureTrader)
- [ ] Prop firm account ($50k+) — TakeProfitTrading, FTMO, etc.
- [ ] Reliable internet (no lag = critical)
- [ ] Second monitor (chart + order entry at same time)

**Optional but helpful:**
- [ ] Bookmap ($99-999/month) — real Level 2 data
- [ ] Discord community (FlowZoneTrader has one)
- [ ] Trading journal software (Excel, TradingView notes)

---

## PROGRESSION TIMELINE

| Week | Focus | Goal |
|------|-------|------|
| 1-2 | Paper trade ORB only | 70% win rate, 5+ trades |
| 3-4 | Add Liquidity Grab + Footprint | 70% combined win rate |
| 5 | Live $50k account, ORB only | 5 days of profit |
| 6+ | Add strategies + scale position size | 1-3% daily equity gain |

---

## PSYCHOLOGY ANCHOR

**Remember this when losing:**
- You don't need 90% win rate to get rich
- 70% win rate + 1:1.5 risk/reward = 5% monthly growth
- 5% monthly = 60% yearly (amazing for prop trading)
- Consistency beats home runs
- The money is in the boring, repeatable setups

**Remember this when frustrated:**
- Order flow doesn't lie
- If you're confused, your setup is wrong (skip it)
- The best trade is the one you DON'T take
- Risk management wins the game
- Ask: "Am I following my rules?" before every trade

---

## Quick Setup: TradingView

1. Open NQ on TradingView
2. Add Indicators:
   - EMA 9 (blue)
   - EMA 21 (red)
3. Switch to Footprint Chart view:
   - Right-click chart → Footprint
4. Set alerts:
   - When price crosses EMA(9)
   - When volume > MA(20) volume
5. Pin the chart on multiple monitors (entry + market overview)

---

**Print this page. Keep it by your desk. Check it before every trade.**

**Last updated:** May 4, 2026
**Strategies sourced from:** FlowZoneTrader YouTube channel + course content
**Your job:** Paper trade for 2 weeks, then decide if you're ready for live money.
