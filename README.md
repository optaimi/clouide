# Clouide

**Clouide** is a full-stack, browser-based integrated development environment designed to run securely on cloud infrastructure. It features a modern React frontend, a powerful FastAPI backend, and runs entirely within Docker containers to ensure security and user isolation.

## 🚀 Features

- **Full-Featured Code Editor**: Powered by [Monaco Editor](https://microsoft.github.io/monaco-editor/) (VS Code's engine) with syntax highlighting and minimap.
- **File Management**: Create, rename, delete, and organise files and folders via the sidebar explorer.
- **Integrated Terminal**: Secure web-based terminal that executes commands inside an isolated container (running as non-root user `coder`).
- **Git Integration**:
  - Clone public and private repositories.
  - Initialise new git projects.
  - Stage, commit, and push changes directly from the UI.
  - Secure credential management for private GitHub repos.
- **Multi-Theme Support**: Switch between Dark, Light, and Midnight themes.
- **Dockerised Architecture**: Backend runs in an isolated Docker container to prevent unauthorised access to the host machine.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Editor**: @monaco-editor/react
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Server**: Uvicorn
- **Tools**: GitPython, Subprocess
- **Isolation**: Docker & Docker Compose

## 📋 Prerequisites

- **OS**: Linux (Debian/Ubuntu recommended) or macOS.
- **Docker & Docker Compose**: Required for containerisation.
- **Node.js & npm**: Required to build the frontend assets locally before deployment.

## 📦 Installation & Deployment

This project includes a `deploy.sh` script that automates the entire build and deployment process.

1. **Clone the Repository**
   ```bash
   git clone <your-repo-url>
   cd clouide_app

2.  **Make the Deploy Script Executable**

    ```bash
    chmod +x deploy.sh

3.  **Run the Deployment**
    This script will:
      - Pull the latest changes from Git.
      - Build the React frontend locally.
      - Stop any running containers.
      - Rebuild and launch the Docker containers with correct permissions.

    <!-- end list -->

    ```bash
    ./deploy.sh
    ```

4.  **Access the IDE**

      - **Localhost**: Visit `http://localhost:8000`
      - **Remote/Cloud**: Use `ngrok` or your VM's external IP.
        ```bash
        ngrok http 8000
        ```

## 🔒 Security Architecture

To ensure security when running on a cloud VM:

  - **User Isolation**: The backend runs inside a Docker container as a generic user named `coder`. This prevents the web terminal from accessing root files or your cloud provider credentials.
  - **Volume Mapping**: User projects are persisted in a local `workspaces/` directory, which is mounted into the container with restricted permissions.
  - **Frontend Mounting**: The frontend build artifacts (`dist/`) are mounted read-only into the container for serving.

## 📂 Project Structure

```text
.
├── backend/                # FastAPI Application
│   ├── app/main.py         # API Endpoints & Logic
│   └── requirements.txt    # Python Dependencies
├── frontend/               # React Application
│   ├── src/                # Components & Hooks
│   ├── dist/               # Built static files (generated)
│   └── vite.config.ts      # Vite Configuration
├── deploy.sh               # Automated deployment script
├── docker-compose.yml      # Container orchestration config
└── Dockerfile              # Backend container definition
```

## 📄 Licence

Distributed under the MIT Licence. See `LICENSE` for more information.
