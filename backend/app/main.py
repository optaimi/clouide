from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional  # <--- THIS WAS MISSING
import git
import subprocess
import shutil
import os
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory where all user workspaces live
BASE_DIR = os.path.expanduser("~/clouide_workspaces")

# --- Helper Functions ---

def get_workspace_path(session_id: str):
    """Generates a private path for this specific user session"""
    if not session_id or len(session_id) < 5:
        raise HTTPException(status_code=400, detail="Invalid Session ID")
    return os.path.join(BASE_DIR, session_id, "repo")

def get_config_path(session_id: str):
    """Path to store the user's github token"""
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

# --- Models ---

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
        return {"status": "success", "message": "Credentials saved"}
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

@app.post("/init")
def init_workspace(x_session_id: str = Header(...)):
    workspace = get_workspace_path(x_session_id)
    try:
        if os.path.exists(workspace):
            shutil.rmtree(workspace)
        os.makedirs(workspace, exist_ok=True)
        return {"status": "success", "message": "Workspace initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@app.get("/files")
def list_files(x_session_id: str = Header(...)):
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
        raise HTTPException(status_code=401, detail="No credentials found.")

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

@app.post("/terminal")
def run_command(payload: CommandRequest, x_session_id: str = Header(...)):
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
    """Zips the workspace and returns it"""
    # Prioritise Header, fall back to Query Param (for browser downloads)
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

# ----------------- HOST FRONTEND (MUST BE LAST) -----------------

if os.path.exists("../frontend/dist/assets"):
    app.mount("/assets", StaticFiles(directory="../frontend/dist/assets"), name="assets")

@app.get("/")
async def serve_root():
    index_path = "../frontend/dist/index.html"
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