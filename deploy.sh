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

# --- 2. Build Frontend FIRST ---
./scripts/build.sh
if [ $? -ne 0 ]; then 
    echo "❌ Deployment stopped due to build failure."
    exit 1
fi

# --- 3. THE COMBO FIX: Restart & Purge ---
echo "🛑  Restarting Docker to release locks..."
sudo snap restart docker
sleep 5

echo "🧹  Purging stopped containers to prevent 'KeyError'..."
# We remove them now so the old docker-compose binary doesn't crash trying to read them.
# We use '|| true' to ignore errors if they are already gone.
sudo docker rm -f clouide_app_backend_1 2>/dev/null || true
sudo docker ps -a -q --filter "name=clouide" | xargs -r sudo docker rm -f

# --- 4. Run Cleanup ---
./scripts/cleanup.sh

# --- 5. Docker Configuration ---
echo "🔧 Configuring Environment..."
mkdir -p "$APP_DIR/workspaces"
sudo chmod -R 777 "$APP_DIR/workspaces"

# --- 6. Launch Services ---
echo "🚀  Launching containers..."

# Try to find a working docker-compose command
if docker compose version > /dev/null 2>&1; then
    DC="docker compose"
elif command -v docker-compose &> /dev/null; then
    DC="docker-compose"
else
    echo "❌ Error: Docker Compose not found."
    exit 1
fi

echo "   Using command: $DC"

# Fresh start
sudo $DC up -d --build --remove-orphans --force-recreate

echo "=========================================="
echo "✅ Deployment Complete! App is live."
echo "=========================================="