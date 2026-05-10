#!/bin/bash

# 30-Day Range Trading Bot (Curl-based, Coinbase JWT)
# Fetches 30-day candles, calculates buy/sell zones, logs to CSV

set -e

source /home/harreson/.openclaw/workspace/.env

CLIENT_ID="1042289182085-k4nki44g908fvbcmvhqrmlfo8rmp1u9t.apps.googleusercontent.com"
CLIENT_SECRET="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"

API_KEY="$COINBASE_API_KEY"
PRIVATE_KEY="$COINBASE_PRIVATE_KEY"
WORKSPACE="/home/harreson/.openclaw/workspace"
LOG_FILE="$WORKSPACE/bot-30day-range-local.log"
TRADES_FILE="$WORKSPACE/trades-30day.csv"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

init_logs() {
  if [ ! -f "$TRADES_FILE" ]; then
    echo "DateTime,Symbol,Price,Buy_Zone_Low,Buy_Zone_High,Sell_Zone_Low,Sell_Zone_High,Position_Percent,Action,Reason" > "$TRADES_FILE"
  fi
}

get_jwt() {
  local method="$1"
  local path="$2"
  
  node - <<EOF 2>/dev/null
import "dotenv/config";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const api_key = "$API_KEY";
const private_key = \`$PRIVATE_KEY\`.replace(/\\\\n/g, '\\n').trim();

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
EOF
}

check_symbol() {
  local symbol="$1"
  
  log "━━━ Checking $symbol ━━━"
  
  # Get current price
  local price=$(curl -s "https://api.coinbase.com/api/v3/brokerage/products/${symbol}-USD" | grep -o '"price":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$price" ]; then
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
  
  # Parse min/max from candles using Python
  local ranges=$(python3 << PYTHON_EOF
import json
import sys

try:
    data = json.loads(r'''$candles''')
    if not isinstance(data, list) or len(data) == 0:
        print("ERROR")
        sys.exit(1)
    
    lows = [float(c[1]) for c in data]
    highs = [float(c[2]) for c in data]
    current = float('$price')
    
    min_30d = min(lows)
    max_30d = max(highs)
    range_size = max_30d - min_30d
    
    buy_low = min_30d
    buy_high = min_30d + (range_size * 0.30)
    sell_low = min_30d + (range_size * 0.70)
    sell_high = max_30d
    position_pct = ((current - min_30d) / range_size) * 100
    
    print(f"{min_30d:.2f},{max_30d:.2f},{buy_low:.2f},{buy_high:.2f},{sell_low:.2f},{sell_high:.2f},{position_pct:.2f}")
except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
PYTHON_EOF
  )
  
  if [[ "$ranges" == ERROR* ]]; then
    log "❌ ERROR: Could not parse candles for $symbol"
    return 1
  fi
  
  IFS=',' read -r min_30d max_30d buy_low buy_high sell_low sell_high position_pct <<< "$ranges"
  
  log "📊 30-Day Range: \$$min_30d — \$$max_30d"
  log "🟢 Buy Zone: \$$buy_low — \$$buy_high"
  log "🔴 Sell Zone: \$$sell_low — \$$sell_high"
  log "📍 Position: ${position_pct}% of range"
  
  # Determine action
  local action="HOLD"
  local reason="Waiting for entry/exit"
  
  if (( $(echo "$price >= $buy_low && $price <= $buy_high" | bc -l) )); then
    action="BUY"
    reason="Price in buy zone ($position_pct% of range)"
    log "✅ BUY SIGNAL: $reason"
  elif (( $(echo "$price >= $sell_low && $price <= $sell_high" | bc -l) )); then
    action="SELL"
    reason="Price in sell zone ($position_pct% of range)"
    log "✅ SELL SIGNAL: $reason"
  else
    log "⏳ HOLD: Not in buy or sell zone"
  fi
  
  # Log trade
  echo "$(date -Iseconds),$symbol,$price,$buy_low,$buy_high,$sell_low,$sell_high,$position_pct,$action,$reason" >> "$TRADES_FILE"
}

main() {
  log "═══════════════════════════════════════════════════════════"
  log "🤖 30-Day Range Trading Bot (Local, Coinbase API)"
  log "📍 Mode: PAPER TRADING"
  log "💾 Data: Coinbase Advanced Trade API (JWT authenticated)"
  log "═══════════════════════════════════════════════════════════"
  
  init_logs
  
  log ""
  log "🔄 Cycle: $(date -Iseconds)"
  log ""
  
  for symbol in ETH BTC ATOM DOGE; do
    check_symbol "$symbol"
    sleep 2
  done
  
  log ""
  log "✅ Cycle complete."
}

main
