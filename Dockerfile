# optaimi/clouide/optaimi-Clouide-d713be7f37a659fecc0a2d2fdf2ed5a879f5e5e9/Dockerfile

# Use a lightweight Python image
FROM python:3.11-slim

# 1. Install system dependencies (Git + curl/gnupg for Node setup)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    gnupg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Node.js 20 (Required for these CLIs)
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs

# 3. Install AI CLI Tools Globally
# - @google/gemini-cli (Gemini)
# - opencode-ai (Opencode)
# - @openai/codex (Codex)
# - @anthropic-ai/claude-code (Claude Code)
RUN npm install -g @google/gemini-cli opencode-ai @openai/codex @anthropic-ai/claude-code

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Create a non-root user 'coder'
RUN useradd -m coder
RUN mkdir -p /home/coder/clouide_workspaces && chown -R coder:coder /home/coder/clouide_workspaces

USER coder

# Run the backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]