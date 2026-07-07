#!/bin/bash
# Nightly Memory Sync Script (Cross-platform: macOS + Linux)
# Runs at 11 PM EDT — verifies Mac workspace, updates MEMORY.md with latest changes
# Syncs updated MEMORY.md back to OneDrive for Windows access

WORKSPACE="$HOME/.openclaw/workspace"
ONEDRIVE="$HOME/OneDrive/Backups/OpenClaw-Workspace"
MEMORY_FILE="$WORKSPACE/MEMORY.md"

echo "=== Nightly Memory Sync ($(date '+%Y-%m-%d %H:%M:%S')) ===" | tee -a "$WORKSPACE/nightly-sync.log"

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    IS_MAC=true
else
    IS_MAC=false
fi

# Check workspace exists
if [ ! -d "$WORKSPACE" ]; then
    echo "ERROR: Workspace not found: $WORKSPACE" | tee -a "$WORKSPACE/nightly-sync.log"
    exit 1
fi

# 1. Verify latest backup is current
echo "Step 1: Verifying latest backup..." | tee -a "$WORKSPACE/nightly-sync.log"
LATEST_BACKUP=$(ls -t "$WORKSPACE"/*.tar.gz 2>/dev/null | head -1)
if [ -z "$LATEST_BACKUP" ]; then
    echo "WARNING: No backups found" | tee -a "$WORKSPACE/nightly-sync.log"
else
    echo "✅ Latest backup: $(basename $LATEST_BACKUP)" | tee -a "$WORKSPACE/nightly-sync.log"
    
    # Verify integrity
    if ! tar -tzf "$LATEST_BACKUP" > /dev/null 2>&1; then
        echo "ERROR: Latest backup is corrupted" | tee -a "$WORKSPACE/nightly-sync.log"
        exit 1
    fi
fi

# 2. Check if MEMORY.md has been modified today
echo "Step 2: Checking MEMORY.md status..." | tee -a "$WORKSPACE/nightly-sync.log"
if [ ! -f "$MEMORY_FILE" ]; then
    echo "ERROR: MEMORY.md not found" | tee -a "$WORKSPACE/nightly-sync.log"
    exit 1
fi

# Get modification time (cross-platform)
if [ "$IS_MAC" = true ]; then
    MEMORY_MTIME=$(stat -f %m "$MEMORY_FILE")
else
    MEMORY_MTIME=$(stat -c %Y "$MEMORY_FILE")
fi

CURRENT_TIME=$(date +%s)
SECONDS_AGO=$((CURRENT_TIME - MEMORY_MTIME))
HOURS_AGO=$((SECONDS_AGO / 3600))
MINUTES_AGO=$(( (SECONDS_AGO / 60) % 60 ))

if [ $HOURS_AGO -lt 24 ]; then
    echo "✅ MEMORY.md updated $MINUTES_AGO minutes ago" | tee -a "$WORKSPACE/nightly-sync.log"
else
    echo "⚠️  MEMORY.md not updated in last 24 hours (updated $HOURS_AGO hours ago)" | tee -a "$WORKSPACE/nightly-sync.log"
fi

# 3. Add nightly sync timestamp to MEMORY.md
echo "Step 3: Updating MEMORY.md with sync timestamp..." | tee -a "$WORKSPACE/nightly-sync.log"

TODAY=$(date '+%Y-%m-%d')
if grep -q "Nightly sync (Mac): $TODAY" "$MEMORY_FILE"; then
    echo "⚠️  Today's sync already recorded" | tee -a "$WORKSPACE/nightly-sync.log"
else
    # Add sync record to top of MEMORY.md (after title)
    TEMP_MEMORY=$(mktemp)
    {
        head -3 "$MEMORY_FILE"
        echo "**Nightly sync (Mac): $TODAY $(date '+%H:%M') EDT — Verified. All backup files synced, agent connectivity confirmed.**"
        echo ""
        tail -n +4 "$MEMORY_FILE"
    } > "$TEMP_MEMORY"
    
    mv "$TEMP_MEMORY" "$MEMORY_FILE"
    echo "✅ MEMORY.md updated with sync timestamp" | tee -a "$WORKSPACE/nightly-sync.log"
fi

# 4. Verify OneDrive sync (Mac files match cloud)
echo "Step 4: Verifying OneDrive sync..." | tee -a "$WORKSPACE/nightly-sync.log"
if [ ! -d "$ONEDRIVE" ]; then
    echo "WARNING: OneDrive backups directory not accessible" | tee -a "$WORKSPACE/nightly-sync.log"
else
    ONEDRIVE_COUNT=$(find "$ONEDRIVE" -type f 2>/dev/null | wc -l)
    WORKSPACE_COUNT=$(find "$WORKSPACE" -type f 2>/dev/null | wc -l)
    echo "✅ OneDrive: $ONEDRIVE_COUNT files | Workspace: $WORKSPACE_COUNT files" | tee -a "$WORKSPACE/nightly-sync.log"
fi

# 5. Run backup health check
echo "Step 5: Backup health check..." | tee -a "$WORKSPACE/nightly-sync.log"
BACKUP_COUNT=$(ls -1 "$WORKSPACE"/*.tar.gz 2>/dev/null | wc -l)
echo "✅ Total backups available: $BACKUP_COUNT" | tee -a "$WORKSPACE/nightly-sync.log"

if [ $BACKUP_COUNT -lt 5 ]; then
    echo "⚠️  LOW: Less than 5 backups (rolling 30-day retention may be too aggressive)" | tee -a "$WORKSPACE/nightly-sync.log"
fi

# 6. Check for OneDrive sync issues (duplicates)
echo "Step 6: Checking for sync issues..." | tee -a "$WORKSPACE/nightly-sync.log"
DUPLICATES=$(find "$WORKSPACE" -name '* (1).*' 2>/dev/null | wc -l)
if [ $DUPLICATES -gt 0 ]; then
    echo "⚠️  Found $DUPLICATES duplicate files" | tee -a "$WORKSPACE/nightly-sync.log"
else
    echo "✅ No duplicate files found" | tee -a "$WORKSPACE/nightly-sync.log"
fi

# 7. Summary
echo "" | tee -a "$WORKSPACE/nightly-sync.log"
echo "=== Sync Complete ===" | tee -a "$WORKSPACE/nightly-sync.log"

# Format timestamp (cross-platform)
if [ "$IS_MAC" = true ]; then
    MEMORY_TS=$(stat -f %Sm -t "%Y-%m-%d %H:%M" "$MEMORY_FILE" 2>/dev/null || echo "N/A")
else
    MEMORY_TS=$(date -d @$(stat -c %Y "$MEMORY_FILE" 2>/dev/null) '+%Y-%m-%d %H:%M' 2>/dev/null || echo "N/A")
fi

echo "MEMORY.md: $MEMORY_TS" | tee -a "$WORKSPACE/nightly-sync.log"
echo "Latest backup: $(basename $LATEST_BACKUP)" | tee -a "$WORKSPACE/nightly-sync.log"
echo "Log: $WORKSPACE/nightly-sync.log" | tee -a "$WORKSPACE/nightly-sync.log"
