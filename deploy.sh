#!/bin/bash

# --- Auto-detect paths ---
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
FRONTEND_DIR="$APP_DIR/frontend"

echo "🚀 Starting Deployment from $APP_DIR..."

# --- Auto-detect Docker command ---
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# --- Update Code ---
echo "⬇️  Pulling latest changes..."
git pull origin main || git pull origin master

# --- Build Frontend ---
echo "📦 Building Frontend..."
cd "$FRONTEND_DIR"
# Always install to ensure packages like xterm are added
npm install
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed. Aborting."
  exit 1
fi

# --- Config & Permissions ---
echo "🔧 Configuring Docker..."
cd "$APP_DIR"

# Generate simple compose file (No API keys needed here)
cat > docker-compose.yml <<EOF
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./workspaces:/home/coder/clouide_workspaces
      - ./frontend/dist:/frontend/dist
    environment:
      - PYTHONUNBUFFERED=1
EOF

# Ensure workspace folder exists and is writable
mkdir -p "$APP_DIR/workspaces"
chmod -R 777 "$APP_DIR/workspaces"

# --- Launch ---
echo "🛑 Restarting containers..."
$DOCKER_COMPOSE down
$DOCKER_COMPOSE up --build --force-recreate -d

echo "=========================================="
echo "✅ Deployment Complete! App is live."
echo "=========================================="