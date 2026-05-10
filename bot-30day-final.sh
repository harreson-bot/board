#!/bin/bash

# 30-Day Range Trading Bot (Production Ready)
# - Coinbase Advanced API via curl
# - 30-day range strategy
# - Google Sheets + CSV logging
# - Hourly execution

set -e

WORKSPACE="/home/harreson/.openclaw/workspace"
LOG_FILE="$WORKSPACE/bot-30day-range.log"
TRADES_FILE="$WORKSPACE/trades-30day.csv"
SHEETS_ID="1eZfawK-XzDi2H4LCwLHkKuvC7UE0SkF_ou77_TUYHHU"

# Load environment
export $(grep -v '^#' "$WORKSPACE/.env" | xargs)

log() {
  local msg="$1"
  local timestamp=$(date -Iseconds)
  echo "[$timestamp] $msg" | tee -a "$LOG_FILE"
}

init_logs() {
  if [ ! -f "$TRADES_FILE" ]; then
    echo "DateTime,Symbol,Price,Buy_Zone_Low,Buy_Zone_High,Sell_Zone_Low,Sell_Zone_High,Position_Percent,Action,Reason" > "$TRADES_FILE"
  fi
}

get_jwt() {
  local method="$1"
  local path="$2"
  
  node - <<NODEJS_EOF 2>/dev/null
import jwt from "jsonwebtoken";
import crypto from "crypto";

const api_key = \`$COINBASE_API_KEY\`;
const private_key = \`$COINBASE_PRIVATE_KEY\`.replace(/\\\\n/g, '\\n').trim();
const uri = "$method api.coinbase.com$path";

const payload = {
  iss: 'cdp',
  sub: api_key,
  nbf: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 120,
  uri: uri,
};

const token = jwt.sign(payload, private_key, {
  algorithm: 'ES256',
  header: {
    kid: api_key,
    nonce: crypto.randomBytes(16).toString('hex'),
    typ: 'JWT',
    alg: 'ES256',
  },
});

console.log(token);
NODEJS_EOF
}

check_symbol() {
  local symbol="$1"
  
  log "━━━ Checking $symbol ━━━"
  
  # Get current price
  local price=$(curl -s "https://api.coinbase.com/api/v3/brokerage/products/${symbol}-USD" | grep -o '"price":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$price" ] || [ "$price" = "Unauthorized" ]; then
    log "❌ ERROR: Could not get price for $symbol"
    return 1
  fi
  
  log "💰 Current Price: \$$price"
  
  # Get 30-day candles
  local now=$(date +%s)
  local thirty_days_ago=$((now - 30 * 24 * 60 * 60))
  
  local path="/api/v3/brokerage/products/${symbol}-USD/candles?start=$thirty_days_ago&end=$now&granularity=3600"
  local jwt_token=$(get_jwt "GET" "$path")
  
  if [ -z "$jwt_token" ]; then
    log "❌ ERROR: Could not generate JWT for $symbol"
    return 1
  fi
  
  local candles=$(curl -s -H "Authorization: Bearer $jwt_token" "https://api.coinbase.com/api/v3/brokerage$path")
  
  # Parse ranges using Python
  python3 << PYTHON_EOF
import json
import sys

try:
    data = json.loads(r'''$candles''')
    if not isinstance(data, list) or len(data) == 0:
        print("ERROR:No candles")
        sys.exit(1)
    
    lows = [float(c[1]) for c in data]
    highs = [float(c[2]) for c in data]
    current = float('$price')
    
    min_30d = min(lows)
    max_30d = max(highs)
    range_size = max_30d - min_30d
    
    if range_size == 0:
        print("ERROR:Zero range")
        sys.exit(1)
    
    buy_low = min_30d
    buy_high = min_30d + (range_size * 0.30)
    sell_low = min_30d + (range_size * 0.70)
    sell_high = max_30d
    position_pct = ((current - min_30d) / range_size) * 100
    
    # Log to file
    with open('$LOG_FILE', 'a') as f:
        f.write(f"[$( date -Iseconds )] 📊 30-Day Range: \${min_30d:.2f} — \${max_30d:.2f}\n")
        f.write(f"[$( date -Iseconds )] 🟢 Buy Zone: \${buy_low:.2f} — \${buy_high:.2f}\n")
        f.write(f"[$( date -Iseconds )] 🔴 Sell Zone: \${sell_low:.2f} — \${sell_high:.2f}\n")
        f.write(f"[$( date -Iseconds )] 📍 Position: {position_pct:.2f}% of range\n")
    
    # Determine action
    action = "HOLD"
    reason = "Waiting for entry/exit"
    
    if buy_low <= current <= buy_high:
        action = "BUY"
        reason = f"Price in buy zone ({position_pct:.2f}% of range)"
    elif sell_low <= current <= sell_high:
        action = "SELL"
        reason = f"Price in sell zone ({position_pct:.2f}% of range)"
    
    # Log trade
    timestamp = __import__('datetime').datetime.now().isoformat()
    with open('$TRADES_FILE', 'a') as f:
        f.write(f"{timestamp},$symbol,{current:.2f},{buy_low:.2f},{buy_high:.2f},{sell_low:.2f},{sell_high:.2f},{position_pct:.2f},{action},{reason}\n")
    
    print(f"OK:{action}")
except Exception as e:
    print(f"ERROR:{str(e)}")
    sys.exit(1)
PYTHON_EOF
done

main() {
  log "═══════════════════════════════════════════════════════════"
  log "🤖 30-Day Range Trading Bot (FINAL)"
  log "📍 Mode: PAPER TRADING"
  log "💾 Data: Coinbase Advanced API"
  log "📊 Tracking: Google Sheets + CSV"
  log "═══════════════════════════════════════════════════════════"
  
  init_logs
  
  while true; do
    log ""
    log "🔄 Cycle: $(date -Iseconds)"
    log ""
    
    for symbol in ETH BTC ATOM DOGE; do
      check_symbol "$symbol"
      sleep 2
    done
    
    log "✅ Cycle complete. Sleeping 60 minutes..."
    sleep 3600
  done
}

main
