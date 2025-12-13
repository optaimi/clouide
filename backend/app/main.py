# backend/app/main.py
from fastapi import FastAPI, HTTPException, Header, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import git
import subprocess
import shutil
import os
import json
import asyncio

app = FastAPI()

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions ---
# Base directory for all users
BASE_DIR = os.path.expanduser("~/clouide_workspaces")

def get_workspace_path(session_id: str):
    """Build the path to the user's workspace folder, rejecting obviously invalid IDs."""
    if not session_id or len(session_id) < 5:
        # Note: In WebSockets this raises an error that needs catching,
        # but for HTTP endpoints it returns 400.
        raise HTTPException(status_code=400, detail="Invalid Session ID")
    return os.path.join(BASE_DIR, session_id, "repo")

def get_config_path(session_id: str):
    """Return the path to the per-session config file that stores Git credentials."""
    return os.path.join(BASE_DIR, session_id, "config.json")

def save_credentials(session_id: str, username: str, token: str):
    """Persist Git credentials for the current browser session so the API can reuse them."""
    config_path = get_config_path(session_id)
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    with open(config_path, "w") as f:
        json.dump({"username": username, "token": token}, f)

def get_credentials(session_id: str):
    """Load any cached Git credentials; return None when the user has not signed in."""
    config_path = get_config_path(session_id)
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            return json.load(f)
    return None

def inject_auth(url: str, username: str, token: str):
    """Insert credentials into a Git URL so private repositories can be fetched."""
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
    """Lightweight endpoint used by probes to confirm the API is reachable."""
    return {"status": "ok", "service": "Clouide Multi-Tenant"}

@app.post("/login")
def login_git(payload: LoginRequest, x_session_id: str = Header(...)):
    """Store the supplied GitHub username and token for the active browser session."""
    try:
        save_credentials(x_session_id, payload.username, payload.token)
        return {"status": "success", "message": "Credentials saved for this session"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/logout")
def logout_git(x_session_id: str = Header(...)):
    """Clear any saved credentials for the session so future Git actions are anonymous."""
    try:
        config_path = get_config_path(x_session_id)
        if os.path.exists(config_path):
            os.remove(config_path)
        return {"status": "success", "message": "Logged out"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/clone")
def clone_repository(payload: CloneRequest, x_session_id: str = Header(...)):
    """Clone a Git repository into the user's workspace, inserting auth when required."""
    workspace = get_workspace_path(x_session_id)
    creds = get_credentials(x_session_id)
    
    try:
        if os.path.exists(workspace):
            shutil.rmtree(workspace)
        os.makedirs(workspace, exist_ok=True)
        # Ensure directory is empty for git clone
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
    """Create a brand new Git repository with a simple README for the user."""
    workspace = get_workspace_path(x_session_id)
    project_name = payload.project_name if payload else "my-project"
    
    try:
        # 1. Clear existing
        if os.path.exists(workspace):
            shutil.rmtree(workspace)
        os.makedirs(workspace, exist_ok=True)
        
        # 2. Initialize Git
        repo = git.Repo.init(workspace)
        
        # 3. Create README.md
        readme_path = os.path.join(workspace, "README.md")
        with open(readme_path, "w") as f:
            f.write(f"# {project_name}\n\nInitialized by Clouide.")
            
        return {"status": "success", "message": f"Workspace '{project_name}' initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files")
def list_files(x_session_id: str = Header(...)):
    """Return a flat list of files inside the user's workspace (excluding Git internals)."""
    workspace = get_workspace_path(x_session_id)
    files = []
    if not os.path.exists(workspace):
        return {"files": []}
        
    for root, dirs, filenames in os.walk(workspace):
        if ".git" in dirs: dirs.remove(".git")
        for filename in filenames:
            if filename.startswith(".git"): continue
            full_path = os.path.join(root, filename)
            rel_path = os.path.relpath(full_path, workspace)
            files.append(rel_path)
    return {"files": sorted(files)}

@app.post("/read")
def read_file(payload: FileReadRequest, x_session_id: str = Header(...)):
    """Load a file's contents as text, protecting against directory traversal attempts."""
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
    """Write the supplied content into the chosen file, creating folders as needed."""
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
    """Delete a file or folder from the workspace after confirming the path is safe."""
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
    """Rename a file or folder, ensuring the destination exists before moving it."""
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
    """Commit local changes and push them to the original remote using stored credentials."""
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

# --- NEW: WebSocket Terminal Endpoint ---
@app.websocket("/terminal/ws/{session_id}")
async def terminal_websocket(websocket: WebSocket, session_id: str):
    """Provide an interactive shell by streaming command output over WebSockets."""
    await websocket.accept()
    
    try:
        workspace = get_workspace_path(session_id)
        if not os.path.exists(workspace):
            await websocket.send_text("Error: Workspace not found. Please initialize a project.")
            await websocket.close()
            return
            
        while True:
            # 1. Receive command from client
            command = await websocket.receive_text()
            
            # 2. Execute command asynchronously
            # This prevents blocking the entire API server while the command runs
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=workspace
            )
            
            # 3. Stream output (stdout and stderr)
            async def stream_output(stream):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    await websocket.send_text(line.decode())

            # Gather output from both streams
            await asyncio.gather(
                stream_output(process.stdout),
                stream_output(process.stderr)
            )
            
            # Wait for process to finish
            await process.wait()
            
    except WebSocketDisconnect:
        print(f"Session {session_id} disconnected")
    except Exception as e:
        await websocket.send_text(f"System Error: {str(e)}")
        # Don't close immediately on command error, allow retry

# --- Legacy HTTP Terminal Endpoint (Optional, can be kept as fallback) ---
@app.post("/terminal")
def run_command(payload: CommandRequest, x_session_id: str = Header(...)):
    """Legacy HTTP-based terminal endpoint retained for clients that lack WebSocket support."""
    workspace = get_workspace_path(x_session_id)
    os.makedirs(workspace, exist_ok=True)
    
    try:
        result = subprocess.run(
            payload.command,
            shell=True,
            cwd=workspace,
            capture_output=True,
            text=True
        )
        return {
            "output": result.stdout,
            "error": result.stderr,
            "returncode": result.returncode
        }
    except Exception as e:
        return {"error": str(e), "output": "", "returncode": 1}

@app.get("/download")
def download_workspace(x_session_id: Optional[str] = Header(None), session_id: Optional[str] = Query(None)):
    """Bundle the user's workspace into a zip so it can be downloaded from the browser."""
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

# Serve static assets
if os.path.exists("/frontend/dist/assets"):
    app.mount("/assets", StaticFiles(directory="/frontend/dist/assets"), name="assets")

# Serve Frontend (SPA Catch-all)
@app.get("/")
async def serve_root():
    """Serve the built frontend when available, otherwise report the missing build."""
    index_path = "/frontend/dist/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "error", "message": "Frontend not built"}

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Catch-all route for the single-page app, serving static files when they exist."""
    file_path = f"../frontend/dist/{full_path}"
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    index_path = "../frontend/dist/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"status": "error", "message": "Frontend not built"}