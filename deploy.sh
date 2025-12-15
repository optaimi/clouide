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
# We build first so we don't need Docker yet. 
# This prevents the "restart -> wait 10s -> stuck again" loop.
./scripts/build.sh
if [ $? -ne 0 ]; then 
    echo "❌ Deployment stopped due to build failure."
    exit 1
fi

# --- 3. THE SNAP FIX: Restart Docker Now ---
# We do this AFTER the build, right before we need it.
# This breaks the AppArmor locks on the 'workspaces' folder.
echo "🛑  Restarting Snap Docker Service..."
sudo snap restart docker
sleep 5

# --- 4. Run Cleanup ---
# Now that Docker is fresh, we can clean up without permission errors.
./scripts/cleanup.sh

# --- 5. Docker Configuration ---
echo "🔧 Configuring Environment..."
mkdir -p "$APP_DIR/workspaces"
sudo chmod -R 777 "$APP_DIR/workspaces"

# --- 6. Launch Services ---
echo "🚀  Launching containers..."

if command -v docker-compose &> /dev/null; then
    DC="docker-compose"
else
    DC="docker compose"
fi

# We use --force-recreate to ensure it uses the fresh build
# We don't need 'down' or 'rm' because 'snap restart' already killed everything.
sudo $DC up -d --build --remove-orphans --force-recreate

echo "=========================================="
echo "✅ Deployment Complete! App is live."
echo "=========================================="