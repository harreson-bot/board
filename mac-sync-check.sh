#!/bin/bash
# Mac Workspace Sync Verification Script
# Verifies Mac workspace is synced with OneDrive, checks file integrity

WORKSPACE="$HOME/.openclaw/workspace"
ONEDRIVE="$HOME/OneDrive/Backups/OpenClaw-Workspace"

echo "=== Mac Workspace Sync Check ==="
echo "Timestamp: $(date)"
echo ""

# Check if workspace exists
if [ ! -d "$WORKSPACE" ]; then
    echo "❌ Workspace not found: $WORKSPACE"
    exit 1
fi

# Check if OneDrive backups exist
if [ ! -d "$ONEDRIVE" ]; then
    echo "❌ OneDrive backups not found: $ONEDRIVE"
    exit 1
fi

# Count files in workspace
WORKSPACE_COUNT=$(find "$WORKSPACE" -type f | wc -l)
echo "✅ Workspace files: $WORKSPACE_COUNT"

# Check critical files exist
echo ""
echo "Checking critical files..."
for file in MEMORY.md TOOLS.md AGENTS.md; do
    if [ -f "$WORKSPACE/$file" ]; then
        SIZE=$(ls -lh "$WORKSPACE/$file" | awk '{print $5}')
        TS=$(stat -f %Sm -t "%Y-%m-%d %H:%M" "$WORKSPACE/$file")
        echo "✅ $file — $SIZE — Updated: $TS"
    else
        echo "❌ $file — NOT FOUND"
    fi
done

# Check backup files
echo ""
echo "Checking backup archives..."
BACKUP_COUNT=$(ls -1 "$WORKSPACE"/*.tar.gz 2>/dev/null | wc -l)
echo "✅ Total backups: $BACKUP_COUNT"

# List latest 3 backups
echo ""
echo "Latest backups:"
ls -1t "$WORKSPACE"/*.tar.gz 2>/dev/null | head -3 | while read file; do
    SIZE=$(ls -lh "$file" | awk '{print $5}')
    BASENAME=$(basename "$file")
    echo "  - $BASENAME ($SIZE)"
done

# Verify tar.gz integrity of latest backup
echo ""
echo "Checking latest backup integrity..."
LATEST_BACKUP=$(ls -t "$WORKSPACE"/*.tar.gz 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    if tar -tzf "$LATEST_BACKUP" > /dev/null 2>&1; then
        echo "✅ Latest backup is valid: $(basename $LATEST_BACKUP)"
    else
        echo "❌ Latest backup is CORRUPTED: $(basename $LATEST_BACKUP)"
    fi
else
    echo "⚠️  No backups found"
fi

# Check for duplicates (common OneDrive sync issue)
echo ""
echo "Checking for duplicate files..."
DUPLICATES=$(find "$WORKSPACE" -name '* (1).tar.gz' 2>/dev/null | wc -l)
if [ $DUPLICATES -gt 0 ]; then
    echo "⚠️  Found $DUPLICATES duplicate files (marked with ' (1)')"
    echo "   Run: rm ~/OneDrive/Backups/OpenClaw-Workspace/*' (1).tar.gz' to clean"
else
    echo "✅ No duplicate files found"
fi

echo ""
echo "=== Sync Check Complete ==="
