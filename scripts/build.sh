#!/bin/bash

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$APP_DIR/frontend"

echo "📦 Building Frontend..."

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Frontend directory not found at $FRONTEND_DIR"
    exit 1
fi

cd "$FRONTEND_DIR" || exit

# Install dependencies (Optimized for speed)
# --no-audit: Skips security audit (saves time)
# --prefer-offline: Uses cached packages if available
npm install --no-audit --prefer-offline

# Build the app
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed."
  exit 1
fi

echo "✅ Frontend built successfully."