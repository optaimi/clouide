# optaimi/clouide/optaimi-Clouide-d713be7f37a659fecc0a2d2fdf2ed5a879f5e5e9/deploy.sh

#!/bin/bash

# --- Configuration ---
APP_DIR="$HOME/clouide_app"
FRONTEND_DIR="$APP_DIR/frontend"

echo "🚀 Starting Deployment Process..."

# 1. Navigate to App Directory
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
else
  echo "❌ Error: App directory not found at $APP_DIR"
  exit 1
fi

# 2. Stop existing containers
echo "🛑 Stopping containers..."
docker-compose down

# 3. Pull Latest Changes
echo "⬇️  Pulling latest changes from git..."
git pull origin main || git pull origin master

# 4. Build Frontend Locally
echo "📦 Building Frontend..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed. Aborting."
  exit 1
fi

# 5. FORCE GENERATE CORRECT DOCKER-COMPOSE
echo "🔧 Generating Docker Configuration..."
cd "$APP_DIR"

# IMPORTANT: We added environment variables for the new CLIs here
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
      # --- API KEYS FOR CLI TOOLS ---
      # You can replace these with \${ENV_VAR} to pull from your host shell
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY}
EOF

# --- FIX: CREATE AND PERMISSION WORKSPACES ---
echo "🔒 Fixing Permissions..."
chmod -R 755 "$FRONTEND_DIR/dist"
mkdir -p "$APP_DIR/workspaces"
chmod -R 777 "$APP_DIR/workspaces"

# 7. Launch Docker
echo "🐳 Launching Docker Container..."
# Pass current shell env vars to the build context
docker-compose up --build -d

echo "=========================================="
echo "✅ Deployment Complete! App is live."
echo "=========================================="