#!/bin/bash

# --- Auto-detect paths ---
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "🚀 Starting Deployment..."

# --- 1. THE NUCLEAR FIX: Restart Docker Daemon FIRST ---
# This kills all running containers and releases their file locks immediately.
# This prevents the "permission denied" errors when trying to stop/delete later.
echo "🛑  Resetting Docker Daemon..."
sudo systemctl restart docker
# Wait a moment for Docker to wake up
sleep 5

# --- 2. Force Sync with Git ---
echo "⬇️  Syncing with GitHub..."
cd "$APP_DIR"
git fetch --all
git reset --hard origin/main
chmod +x scripts/*.sh

# --- 3. Run Helpers ---
# Now that Docker is restarted and containers are dead, cleanup will work.
./scripts/cleanup.sh

# Build the frontend
./scripts/build.sh
if [ $? -ne 0 ]; then 
    echo "❌ Deployment stopped due to build failure."
    exit 1
fi

# --- 4. Docker Configuration ---
echo "🔧 Configuring Environment..."

# Ensure workspace folder exists
mkdir -p "$APP_DIR/workspaces"
# Fix permissions (Sudo is required because previous containers might have left root-owned files)
sudo chmod -R 777 "$APP_DIR/workspaces"

# --- 5. Launch Services ---
echo "🚀  Launching containers..."

if command -v docker-compose &> /dev/null; then
    DC="docker-compose"
else
    DC="docker compose"
fi

# We don't need 'down' because we already restarted the daemon.
# Just bring them up.
sudo $DC up -d --build --remove-orphans --force-recreate

echo "=========================================="
echo "✅ Deployment Complete! App is live."
echo "=========================================="