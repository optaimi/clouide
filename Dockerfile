FROM python:3.11-slim

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV TERM=xterm-256color

# 1. Install System Deps, Node.js 20, and PHP
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    curl \
    gnupg \
    build-essential \
    ca-certificates \
    php && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
    gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | \
    tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 2. Install AI CLI Tools
RUN npm install -g --no-cache \
    @google/gemini-cli \
    opencode-ai \
    @openai/codex \
    @anthropic-ai/claude-code

# 3. Standard Setup
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

# 4. User Permissions
RUN useradd -m coder
RUN mkdir -p /home/coder/clouide_workspaces && chown -R coder:coder /home/coder/clouide_workspaces
USER coder

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]