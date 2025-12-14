# backend/app/main.py
from fastapi import FastAPI, HTTPException, Header, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Set
import git
import subprocess
import shutil
import os
import json
import asyncio
import pty
import signal
import select
import errno

app = FastAPI()

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- State Management ---
# Track active terminal processes so we can kill them
active_terminals: Set[int] = set()

# --- Helper Functions ---
BASE_DIR = os.path.expanduser("~/clouide_workspaces")

def get_workspace_path(session_id: str):
    if not session_id or len(session_id) < 5:
        raise HTTPException(status_code=400, detail="Invalid Session ID")
    return os.path.join(BASE_DIR, session_id, "repo")

def get_config_path(session_id: str):
    return os.path.join(BASE_DIR, session_id, "config.json")

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
    return {"status": "ok", "service": "Clouide Multi-Tenant"}

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
        if os.path.exists(workspace):
            shutil.rmtree(workspace)
        os.makedirs(workspace, exist_ok=True)
        shutil.rmtree(workspace) 

        clone_url = payload.url
        if creds:
            clone_url = inject_auth(payload.url, creds['username'], creds['token'])
            print(f"Cloning with auth for user {creds['username']}...")
        else:
            print(f"Cloning public repo...")

        git.Repo.clone_from(clone_url, workspace)
        return {"status": "success"}
    except Exception as e:
        print(f"Clone Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/init")
def init_workspace(payload: Optional[InitRequest] = None, x_session_id: str = Header(...)):
    workspace = get_workspace_path(x_session_id)
    project_name = payload.project_name if payload else "my-project"
    
    try:
        if os.path.exists(workspace):
            shutil.rmtree(workspace)
        os.makedirs(workspace, exist_ok=True)
        repo = git.Repo.init(workspace)
        readme_path = os.path.join(workspace, "README.md")
        with open(readme_path, "w") as f:
            f.write(f"# {project_name}\n\nInitialized by Clouide.")
        return {"status": "success", "message": f"Workspace '{project_name}' initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files")
def list_files(x_session_id: str = Header(...)):
    workspace = get_workspace_path(x_session_id)
    files = []
    
    if not os.path.exists(workspace):
        raise HTTPException(status_code=404, detail="Workspace not initialized")
    
    # 1. EXPANDED IGNORE LIST: Add .bun, .cache, .local, etc.
    IGNORED_DIRS = {
        '.git', '.bun', '.cache', '.npm', '.config', '.local', '.vscode',
        'node_modules', '__pycache__', 'dist', 'build', 'site-packages', 'venv', 'env'
    }

    for root, dirs, filenames in os.walk(workspace):
        # Filter directories in-place so os.walk does not descend into them
        # We perform a copy of the list to iterate safely while modifying
        for d in list(dirs):
            if d.startswith('.') or d in IGNORED_DIRS:
                dirs.remove(d)
        
        for filename in filenames:
            # Ignore hidden files (dotfiles)
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

# --- Kill Terminals Endpoint ---
@app.post("/terminals/kill")
def kill_all_terminals(x_session_id: str = Header(...)):
    """Kill all active PTY processes to free resources."""
    count = 0
    # Create a copy to iterate safely
    for pid in list(active_terminals):
        try:
            os.kill(pid, signal.SIGKILL)
            count += 1
        except ProcessLookupError:
            pass # Already dead
        finally:
            active_terminals.discard(pid)
            
    return {"status": "success", "message": f"Killed {count} terminal processes"}

# --- PTY Persistent Terminal Endpoint ---
@app.websocket("/terminal/ws/{session_id}")
async def terminal_websocket(websocket: WebSocket, session_id: str):
    """
    Provide an interactive shell using a PTY (Pseudo-Terminal).
    This allows stateful sessions (export vars) and interactive CLIs.
    """
    await websocket.accept()
    
    workspace = get_workspace_path(session_id)
    if not os.path.exists(workspace):
        await websocket.send_text("Error: Workspace not found. Please initialize a project.\r\n")
        await websocket.close()
        return

    # 1. Create PTY pair
    master_fd, slave_fd = pty.openpty()

    # FIX 2: Set HOME env var so 'cd' works as expected
    env = os.environ.copy()
    env["HOME"] = workspace

    # 2. Spawn the shell process attached to the PTY
    # We use 'setsid' to create a new session so it behaves like a real shell
    try:
        process = subprocess.Popen(
            ["/bin/bash"],
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            cwd=workspace,
            env=env, # <--- Apply environment
            preexec_fn=os.setsid, 
            close_fds=True
        )
        
        # Track the process
        active_terminals.add(process.pid)
        
        # Close slave in parent (the child has it now)
        os.close(slave_fd)
        
        # 3. Async loop to read from PTY output and write to WebSocket
        loop = asyncio.get_event_loop()

        async def read_from_pty():
            """Reads data from the PTY master (shell output) and sends to WS"""
            try:
                while True:
                    # Run blocking os.read in an executor to avoid blocking the async loop
                    data = await loop.run_in_executor(None, os.read, master_fd, 1024)
                    if not data:
                        break
                    await websocket.send_text(data.decode(errors='replace'))
            except Exception:
                pass

        async def write_to_pty():
            """Reads data from WS (user input) and writes to PTY master"""
            try:
                while True:
                    data = await websocket.receive_text()
                    # If user sends a specific exit command or disconnects
                    if data == '__ping__': continue
                    
                    # FIX 3: REMOVED the forced '\n' logic. 
                    # We now send exactly what xterm sends us.
                    if data:
                         await loop.run_in_executor(None, os.write, master_fd, data.encode())
            except Exception:
                pass

        # Run reader and writer concurrently
        read_task = asyncio.create_task(read_from_pty())
        write_task = asyncio.create_task(write_to_pty())

        # Wait until one finishes (usually connection closed)
        done, pending = await asyncio.wait(
            [read_task, write_task],
            return_when=asyncio.FIRST_COMPLETED
        )

        for task in pending:
            task.cancel()

    except Exception as e:
        await websocket.send_text(f"\r\nTerminal Error: {str(e)}\r\n")
    finally:
        # Cleanup
        if process.pid in active_terminals:
            active_terminals.discard(process.pid)
        try:
            process.terminate()
            os.close(master_fd)
        except:
            pass
        print(f"Session {session_id} terminal closed")

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