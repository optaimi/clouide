# Dockerfile
FROM python:3.11-slim

# Set environment to prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV TERM=xterm-256color

# 1. Install System Deps & Node.js 20 in a SINGLE layer to save space
# We also clean up apt cache immediately to keep the layer small.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    curl \
    gnupg \
    build-essential \
    ca-certificates && \
    # Install Node.js
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    # Clean up system garbage
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. Install AI CLI Tools in a SINGLE layer
# We use --no-cache to prevent npm from storing huge cache files on disk
RUN npm install -g --no-cache \
    @google/gemini-cli \
    opencode-ai \
    @openai/codex \
    @anthropic-ai/claude-code

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

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]