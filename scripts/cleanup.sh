#!/bin/bash

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACES_DIR="$APP_DIR/workspaces"

echo "[$(date)] 🧹 Starting cleanup routine..."

# 1. Clean old workspaces (older than 24 hours)
if [ -d "$WORKSPACES_DIR" ]; then
    echo "   Checking for stale workspaces in $WORKSPACES_DIR..."
    
    # ADDED SUDO HERE: Force delete files owned by Docker
    sudo find "$WORKSPACES_DIR" -mindepth 1 -maxdepth 1 -type d -mmin +1440 -exec echo "   Removing stale session: {}" \; -exec sudo rm -rf {} +
else
    echo "   No workspaces directory found."
fi

# 2. Prune Docker
echo "   Pruning unused Docker assets..."
# ADDED SUDO HERE
sudo docker system prune -f --filter "until=24h"

echo "[$(date)] ✅ Cleanup complete."