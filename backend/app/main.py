from fastapi import FastAPI, HTTPException, Header, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Set
from collections import defaultdict
import git
import subprocess
import shutil
import os
import json
import asyncio
import struct
import platform
import re

# --- OS-Specific Imports ---
try:
    import pty
    import fcntl
    import termios
    import signal
    IS_UNIX = True
except ImportError:
    IS_UNIX = False
    print("⚠️ Warning: Non-Unix OS detected. Terminal features will be disabled.")

# --- BUG FIX: Prevent Git from hanging on password prompt ---
os.environ["GIT_TERMINAL_PROMPT"] = "0"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- State Management ---
# Maps session_id -> Set of PIDs
session_terminals: Dict[str, Set[int]] = defaultdict(set)

# --- Constants ---
BASE_DIR = os.path.expanduser("~/clouide_workspaces")

# --- Security & Startup ---
@app.on_event("startup")
async def setup_security():
    print(f"🚀 Backend starting. Workspaces root: {BASE_DIR}")
    try:
        os.makedirs(BASE_DIR, exist_ok=True)
        if IS_UNIX:
            try:
                os.chmod(BASE_DIR, 0o300)
            except Exception as e:
                print(f"⚠️ Warning: Could not set secure permissions: {e}")
    except Exception as e:
        print(f"❌ Critical Error during startup: {e}")

# --- Helper Functions ---
def get_workspace_path(session_id: str):
    if not session_id or len(session_id) < 2:
        raise HTTPException(status_code=400, detail="Invalid Session ID")
    safe_id = os.path.basename(session_id)
    return os.path.join(BASE_DIR, safe_id, "repo")

def get_config_path(session_id: str):
    safe_id = os.path.basename(session_id)
    return os.path.join(BASE_DIR, safe_id, "config.json")

def save_credentials(session_id: str, username: str, token: str):
    config_path = get_config_path(session_id)
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    with open(config_path, "w") as f:
        json.dump({"username": username, "token": token}, f)

def get_credentials(session_id: str):
    config_path = get_config_path(session_id)
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            return json.load(f)
    return None

def inject_auth(url: str, username: str, token: str):
    clean_url = url.replace("https://", "") if url.startswith("https://") else url
    return f"https://{username}:{token}@{clean_url}"

def kill_session_processes(session_id: str):
    """Kills all terminal processes associated with a session."""
    if not IS_UNIX: return
    pids = list(session_terminals[session_id])
    for pid in pids:
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        except Exception as e:
            print(f"Error killing PID {pid}: {e}")
    session_terminals[session_id].clear()

# --- Request Models ---
class InitRequest(BaseModel):
    project_name: Optional[str] = "my-project"

class CloneRequest(BaseModel):
    url: str

class FileReadRequest(BaseModel):
    filepath: str

class FileWriteRequest(BaseModel):
    filepath: str
    content: str

class FileDeleteRequest(BaseModel):
    filepath: str

class FileRenameRequest(BaseModel):
    old_path: str
    new_path: str

class LoginRequest(BaseModel):
    username: str
    token: str

class PushRequest(BaseModel):
    commit_message: str

class CommandRequest(BaseModel):
    command: str

# --- Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Clouide Multi-Tenant", "os": platform.system()}

@app.post("/login")
def login_git(payload: LoginRequest, x_session_id: str = Header(...)):
    try:
        save_credentials(x_session_id, payload.username, payload.token)
        return {"status": "success", "message": "Credentials saved for this session"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/logout")
def logout_git(x_session_id: str = Header(...)):
    try:
        config_path = get_config_path(x_session_id)
        if os.path.exists(config_path):
            os.remove(config_path)
        return {"status": "success", "message": "Logged out"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/clone")
def clone_repository(payload: CloneRequest, x_session_id: str = Header(...)):
    workspace = get_workspace_path(x_session_id)
    creds = get_credentials(x_session_id)
    
    try:
        # 1. Kill existing terminals to prevent freezing
        kill_session_processes(x_session_id)

        # 2. Clean workspace
        if os.path.exists(workspace):
            try:
                shutil.rmtree(workspace)
            except OSError as e:
                print(f"Delete error: {e}")
                
        os.makedirs(workspace, exist_ok=True)

        clone_url = payload.url
        if creds:
            clone_url = inject_auth(payload.url, creds['username'], creds['token'])

        git.Repo.clone_from(clone_url, workspace)
        return {"status": "success"}
    except Exception as e:
        error_msg = str(e)
        # Parse GitPython error for cleaner output
        if "Authentication failed" in error_msg:
            safe_msg = "Authentication failed. Please check your token."
        elif "not found" in error_msg.lower():
            safe_msg = "Repository not found."
        else:
            # Extract stderr from GitCommandError if possible
            match = re.search(r"stderr: '(.+)'", error_msg, re.DOTALL)
            if match:
                safe_msg = f"Clone failed: {match.group(1).strip()}"
            else:
                # Fallback cleanup
                safe_msg = f"Clone failed: {error_msg.split('cmdline:')[0].strip()}"
            
        raise HTTPException(status_code=500, detail=safe_msg)

@app.post("/init")
def init_workspace(payload: Optional[InitRequest] = None, x_session_id: str = Header(...)):
    workspace = get_workspace_path(x_session_id)
    project_name = payload.project_name if payload else "my-project"
    
    try:
        # 1. Kill existing terminals
        kill_session_processes(x_session_id)

        # 2. Clean workspace
        if os.path.exists(workspace):
            shutil.rmtree(workspace)
        os.makedirs(workspace, exist_ok=True)
        repo = git.Repo.init(workspace)
        
        # Enhanced README with AI tool documentation
        readme_content = f"""# {project_name}

## Welcome to Clouide!
Clouide is an open-source, browser-based integrated development environment (IDE) which is designed to run securely within isolated Docker containers on cloud infrastructure.
## 💡 Tips & Tricks
- **Save:** Press `Ctrl + S` (or `Cmd + S`) to save your current file.
- **Terminal:** Toggle the terminal panel with the icon in the toolbar.
- **Settings:** Use the **View** menu to adjust Font Size, Word Wrap, and Minimap.
- **Themes:** Click the **Theme** button in the sidebar footer to switch between Dark, Light, and Midnight modes.
- **Download:** You can export your entire workspace at any time via **File > Download Code**.


## 🤖 AI Assistant Tools
This environment comes pre-installed with powerful AI CLI tools.

### 1. Google Gemini (`gemini`)
Interact with Google's Gemini models directly.
'''bash
gemini chat "Explain how React hooks work"
'''

### 2. Opencode (`opencode`)
Open source AI coding assistant.
'''bash
opencode init
opencode suggest "Refactor this file"
'''

### 3. Claude Code (`claude`)
Anthropic's Claude 3.5 Sonnet for development.
'''bash
claude "Create a Python script to parse CSV files"
'''

### 4. OpenAI Codex (`codex`)
Command-line interface for OpenAI's coding models.
'''bash
codex explain src/index.ts
'''

## 🚀 Getting Started
1. Open the **Terminal**.
2. Run any of the commands above.
3. Start coding!
"""

# Create Welcome File instead of README.md to avoid conflicts
        readme_path = os.path.join(workspace, "Welcome.Clouide")
        with open(readme_path, "w") as f:
            f.write(readme_content)
            
        return {"status": "success", "message": f"Workspace '{project_name}' initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files")
def list_files(x_session_id: str = Header(...)):
    workspace = get_workspace_path(x_session_id)
    files = []
    
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="Workspace not initialized")
    
    IGNORED_DIRS = {
        '.git', '.bun', '.cache', '.npm', '.config', '.local', '.vscode',
        'node_modules', '__pycache__', 'dist', 'build', 'site-packages', 'venv', 'env'
    }

    for root, dirs, filenames in os.walk(workspace):
        for d in list(dirs):
            if d.startswith('.') or d in IGNORED_DIRS:
                dirs.remove(d)
        
        for filename in filenames:
            if filename.startswith('.'): continue
            full_path = os.path.join(root, filename)
            rel_path = os.path.relpath(full_path, workspace)
            files.append(rel_path)
            
    return {"files": sorted(files)}

@app.post("/read")
def read_file(payload: FileReadRequest, x_session_id: str = Header(...)):
    workspace = get_workspace_path(x_session_id)
    full_path = os.path.join(workspace, payload.filepath)
    if not os.path.commonpath([workspace, full_path]).startswith(workspace):
        raise HTTPException(status_code=403, detail="Access denied")
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            return {"content": f.read()}
    except UnicodeDecodeError:
        return {"content": "<< Binary File >>"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/write")
def write_file(payload: FileWriteRequest, x_session_id: str = Header(...)):
    workspace = get_workspace_path(x_session_id)
    full_path = os.path.join(workspace, payload.filepath)
    if not os.path.commonpath([workspace, full_path]).startswith(workspace):
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(payload.content)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/delete")
def delete_item(payload: FileDeleteRequest, x_session_id: str = Header(...)):
    workspace = get_workspace_path(x_session_id)
    full_path = os.path.join(workspace, payload.filepath)
    if not os.path.commonpath([workspace, full_path]).startswith(workspace):
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        if os.path.isdir(full_path): shutil.rmtree(full_path)
        else: os.remove(full_path)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rename")
def rename_item(payload: FileRenameRequest, x_session_id: str = Header(...)):
    workspace = get_workspace_path(x_session_id)
    old_full = os.path.join(workspace, payload.old_path)
    new_full = os.path.join(workspace, payload.new_path)
    if not os.path.commonpath([workspace, old_full]).startswith(workspace):
        raise HTTPException(status_code=403, detail="Access denied")
    try:
        os.makedirs(os.path.dirname(new_full), exist_ok=True)
        os.rename(old_full, new_full)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/push")
def push_changes(payload: PushRequest, x_session_id: str = Header(...)):
    workspace = get_workspace_path(x_session_id)
    creds = get_credentials(x_session_id)
    if not creds:
        raise HTTPException(status_code=401, detail="No credentials found. Please login first.")
    try:
        repo = git.Repo(workspace)
        repo.config_writer().set_value("user", "name", creds['username']).release()
        repo.config_writer().set_value("user", "email", f"{creds['username']}@users.noreply.github.com").release()
        repo.git.add(A=True)
        if not repo.is_dirty(untracked_files=True):
            return {"status": "success", "message": "No changes to push"}
        repo.index.commit(payload.commit_message)
        origin = repo.remotes.origin
        original_url = origin.url
        auth_url = inject_auth(original_url, creds['username'], creds['token'])
        with origin.config_writer() as cw:
            cw.set("url", auth_url)
        repo.remotes.origin.push()
        with origin.config_writer() as cw:
            cw.set("url", original_url)
        return {"status": "success", "message": "Pushed successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/terminals/kill")
def kill_all_terminals(x_session_id: str = Header(...)):
    kill_session_processes(x_session_id)
    return {"status": "success", "message": "Terminals killed"}

@app.websocket("/terminal/ws/{session_id}")
async def terminal_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    if not IS_UNIX:
        await websocket.send_text("Error: Terminal not supported on this operating system.\r\n")
        await websocket.close()
        return

    workspace = get_workspace_path(session_id)
    if not os.path.exists(workspace):
        await websocket.send_text("Error: Workspace not found. Please initialize a project.\r\n")
        await websocket.close()
        return

    master_fd, slave_fd = pty.openpty()

    env = os.environ.copy()
    env["HOME"] = workspace
    env["TERM"] = "xterm-256color"
    
    try:
        process = subprocess.Popen(
            ["/bin/bash"],
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            cwd=workspace,
            env=env, 
            preexec_fn=os.setsid, 
            close_fds=True
        )
        
        session_terminals[session_id].add(process.pid)
        os.close(slave_fd)
        
        loop = asyncio.get_event_loop()

        # --- JAIL ENFORCER ---
        async def jail_enforcer():
            try:
                while process.poll() is None:
                    await asyncio.sleep(2)
                    try:
                        current_dir = os.readlink(f"/proc/{process.pid}/cwd")
                        # Handle "(deleted)" suffix if directory is wiped while terminal runs
                        if current_dir.endswith(" (deleted)"):
                            continue # Process will be killed by init/clone logic anyway
                            
                        if not current_dir.startswith(workspace):
                            # Sanitize path for user display
                            safe_path = current_dir.replace(BASE_DIR, "~")
                            await websocket.send_text(f"\r\n\x1b[1;31mSECURITY ALERT: Access denied to {safe_path}.\r\nSession terminated.\x1b[0m\r\n")
                            process.terminate()
                            break
                    except Exception:
                        break
            except asyncio.CancelledError:
                pass
        # ---------------------

        async def read_from_pty():
            try:
                while True:
                    data = await loop.run_in_executor(None, os.read, master_fd, 16384)
                    if not data: break
                    await websocket.send_text(data.decode(errors='replace'))
            except Exception: pass

        async def write_to_pty():
            try:
                while True:
                    data = await websocket.receive_text()
                    if data == '__ping__': continue
                    try:
                        payload = json.loads(data)
                        if isinstance(payload, dict) and payload.get('type') == 'resize':
                            rows = payload.get('rows', 24)
                            cols = payload.get('cols', 80)
                            winsize = struct.pack("HHHH", rows, cols, 0, 0)
                            fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                            continue
                    except: pass
                    if data:
                         await loop.run_in_executor(None, os.write, master_fd, data.encode())
            except Exception: pass

        read_task = asyncio.create_task(read_from_pty())
        write_task = asyncio.create_task(write_to_pty())
        jail_task = asyncio.create_task(jail_enforcer())

        done, pending = await asyncio.wait(
            [read_task, write_task, jail_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending: task.cancel()

    except Exception as e:
        await websocket.send_text(f"\r\nTerminal Error: {str(e)}\r\n")
    finally:
        if process.pid in session_terminals[session_id]:
            session_terminals[session_id].discard(process.pid)
        try:
            process.terminate()
            os.close(master_fd)
        except: pass

@app.get("/download")
def download_workspace(x_session_id: Optional[str] = Header(None), session_id: Optional[str] = Query(None)):
    target_session = x_session_id or session_id
    if not target_session:
        raise HTTPException(status_code=400, detail="Session ID required")
    workspace = get_workspace_path(target_session)
    try:
        zip_path = f"/tmp/workspace_{target_session}"
        shutil.make_archive(zip_path, 'zip', workspace)
        return FileResponse(f"{zip_path}.zip", filename="workspace.zip", media_type="application/zip")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if os.path.exists("/frontend/dist/assets"):
    app.mount("/assets", StaticFiles(directory="/frontend/dist/assets"), name="assets")

@app.get("/")
async def serve_root():
    index_path = "/frontend/dist/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "error", "message": "Frontend not built"}

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = f"../frontend/dist/{full_path}"
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    index_path = "../frontend/dist/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "error", "message": "Frontend not built"}