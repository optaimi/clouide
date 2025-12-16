# ☁️ Clouide

**Clouide** is a cloud-native Integrated Development Environment (IDE) that runs entirely in your browser. It combines a modern React frontend with a secure FastAPI backend, orchestrated via Docker to provide a safe, isolated coding workspace.

It comes pre-configured with powerful **Agentic AI tools**, making it the perfect sandbox for testing LLMs and agentic workflows alongside standard development tasks.

## 🚀 Key Features

### 🤖 Agentic AI Environment
The terminal comes pre-installed with industry-standard AI assistants, running securely in the isolated container:

- **Gemini CLI** – Leverages a massive context window and native multimodal capabilities to analyse entire repositories and complex media inputs.
- **Claude Code** – Functions as an autonomous agentic partner capable of planning, executing, and verifying complex software engineering workflows.
- **OpenAI Codex** – Harnesses the industry-leading reasoning of the models behind GitHub Copilot for deep semantic code understanding.
- **OpenCode** – Offers a transparent, open-source alternative that prioritises developer control, privacy, and model flexibility.

### 💻 Full-Featured Editor

- **Monaco Engine** – Powered by the same editor engine as VS Code.
- **Smart Features** – Syntax highlighting, minimap, and dynamic font sizing.
- **Multi-Theme** – Switch instantly between **Dark**, **Light**, and **Midnight** themes.

### 🛡️ Secure & Isolated

- **Docker Sandbox** – Every session runs in an isolated container.
- **Non-Root Execution** – Commands run as a restricted coder user to protect the host system.
- **Path Validation** – Backend enforces strict path checking to prevent directory traversal attacks.

### 🔧 Powerful Tools

- **Integrated Terminal** – Full xterm.js shell with support for clickable links and resizing.
- **Git Integration**:
  - Clone public or **private** repositories (using Personal Access Tokens).
  - Stage, commit, and push changes directly from the UI.
  - Persistent credential storage per session.
- **File Management** – Create, rename, delete, and download workspace archives.

## 🛠️ Tech Stack

**Frontend**

- React 18 + Vite
- Tailwind CSS (Styling)
- Lucide React (Icons)
- Xterm.js (Terminal emulator)
- Monaco Editor React

**Backend**

- Python 3.11 + FastAPI
- GitPython (Git operations)
- Uvicorn (ASGI Server)
- WebSockets (Real-time terminal streaming)

**Infrastructure**

- Docker & Docker Compose
- Nginx / Node.js (Static serving)

## 📦 Installation & Deployment

Clouide includes an automated deployment script that handles building the frontend, setting up permissions, and launching the containers.

### Prerequisites

- Docker & Docker Compose
- Git
- Node.js & npm (for building the frontend assets)

### Quick Start

1. **Clone the repository**

```bash
git clone https://github.com/optaimi/Clouide
cd Clouide
```

2. **Run the deploy script**

This script builds the React app and starts the Docker services.

```bash
chmod +x deploy.sh
./deploy.sh
```

3. **Access the IDE**

Open your browser and navigate to:

`http://localhost:8000`

## 📖 Usage Guide

### Using AI Tools

Open the terminal and use the pre-installed CLIs.

First, launch the CLI and set up auth/API:

- **Gemini CLI**:

```bash
gemini
```

- **Claude Code**:

```bash
claude
```

- **Codex CLI**:

```bash
codex
```

- **Opencode CLI**:

```bash
opencode
```

Once authenticated you can use them freely for that session. All data is stored securely and associated with your session, wiped daily.

**Example uses**

- **Ask Gemini a question**

```bash
gemini chat "How do React hooks work?"
```

- **Use Claude for coding**

```bash
claude "Write a Python script to parse CSV files"
```

### Working with Private Repos

1. Click **Clone Repository**.
2. Enter the HTTPS URL of your repository.
3. Click the **Private repo?** link to enter your GitHub username and **Personal Access Token (PAT)**.
4. Your credentials are securely stored for the duration of the session.

### Customising the View

- Use the **View** menu to toggle Word Wrap or the Minimap.
- Use the **Settings (gear icon)** in the sidebar to change the active theme.

## 📂 Project Structure

```text
.
├── backend/                # FastAPI application & logic
│   ├── app/main.py         # API endpoints (Git, files, terminal)
│   └── requirements.txt    # Python dependencies
├── frontend/               # React application
│   ├── src/components/     # UI components (terminal, editor, file explorer)
│   ├── public/             # Static assets (favicon, manifest)
│   └── vite.config.ts      # Build configuration
├── workspaces/             # Persisted user project data (Docker volume)
├── deploy.sh               # One-click deployment script
├── docker-compose.yml      # Service orchestration
└── Dockerfile              # Container definition
```

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.