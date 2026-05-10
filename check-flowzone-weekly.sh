#!/bin/bash

# FlowZoneTrader Weekly Market Insights Extractor
# Robust curl-based approach for 3x daily cron jobs

CLIENT_ID="1042289182085-k4nki44g908fvbcmvhqrmlfo8rmp1u9t.apps.googleusercontent.com"
CLIENT_SECRET="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"
REFRESH_TOKEN="1//01x_KeOPxoqh8CgYIARAAGAESNwF-L9Irq58H67BeR2AX_14SNdNDvyOfcVdtRgjYkkQSjFsjZT3iY4VCU9i2qH-1VHw16-EL-J8"
WORKSPACE="/home/harreson/.openclaw/workspace"
LOG_FILE="$WORKSPACE/flowzone-check.log"
TMP_DIR="/tmp/flowzone-$$"
mkdir -p "$TMP_DIR"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

log "=== FlowZoneTrader Weekly Check ==="

# Step 1: Get access token
log "Getting access token..."
curl -s -X POST "https://oauth2.googleapis.com/token" \
  -H "Content-Type: application/json" \
  -d "{\"client_id\":\"$CLIENT_ID\",\"client_secret\":\"$CLIENT_SECRET\",\"refresh_token\":\"$REFRESH_TOKEN\",\"grant_type\":\"refresh_token\"}" \
  > "$TMP_DIR/token.json"

ACCESS_TOKEN=$(python3 -c "import json; print(json.load(open('$TMP_DIR/token.json')).get('access_token', ''))" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
  log "❌ Failed to get access token"
  exit 1
fi

log "✅ Token obtained"

# Step 2: Search for FlowZoneTrader emails
log "Searching for FlowZoneTrader emails..."
curl -s "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=from%3AFlowZoneTrader" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$TMP_DIR/search.json"

# Extract message ID using Python (more reliable)
MESSAGE_ID=$(python3 -c "import json; data=json.load(open('$TMP_DIR/search.json')); print(data.get('messages', [{}])[0].get('id', ''))" 2>/dev/null)

if [ -z "$MESSAGE_ID" ]; then
  log "⚠️ No new FlowZoneTrader emails"
  exit 0
fi

log "✅ Found email: $MESSAGE_ID"

# Step 3: Fetch full message
log "Fetching email content..."
curl -s "https://www.googleapis.com/gmail/v1/users/me/messages/$MESSAGE_ID?format=full" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  > "$TMP_DIR/email.json" 2>&1

# Extract subject
SUBJECT=$(python3 -c "import json; data=json.load(open('$TMP_DIR/email.json')); [print(h['value']) for h in data.get('payload', {}).get('headers', []) if h.get('name')=='Subject']" 2>/dev/null)

log "📬 Subject: $SUBJECT"
log "✅ FlowZoneTrader weekly check completed"

# Save email for later manual review if needed
cp "$TMP_DIR/email.json" "$WORKSPACE/flowzone-latest.json"

exit 0
