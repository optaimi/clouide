#!/bin/bash

# --- Auto-detect paths ---
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "🚀 Starting Deployment..."

# --- 1. Force Sync with Git ---
echo "⬇️  Syncing with GitHub..."
cd "$APP_DIR"
git fetch --all
git reset --hard origin/main
chmod +x scripts/*.sh

# --- 2. Run Helpers ---
# Run cleanup first
./scripts/cleanup.sh

# Build the frontend (No sudo needed here usually)
./scripts/build.sh
if [ $? -ne 0 ]; then 
    echo "❌ Deployment stopped due to build failure."
    exit 1
fi

# --- 3. Docker Configuration ---
echo "🔧 Configuring Environment..."

# Ensure workspace folder exists
mkdir -p "$APP_DIR/workspaces"

# ADDED SUDO HERE: Fix permissions on files owned by Docker
sudo chmod -R 777 "$APP_DIR/workspaces"

# --- 4. Launch Services ---
echo "🛑 Restarting containers..."

if command -v docker-compose &> /dev/null; then
    DC="docker-compose"
else
    DC="docker compose"
fi

# ADDED SUDO HERE: Required to stop/start containers
sudo $DC down
sudo $DC up -d --build --remove-orphans --force-recreate

echo "=========================================="
echo "✅ Deployment Complete! App is live."
echo "=========================================="