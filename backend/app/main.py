# backend/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import git
import shutil
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WORKSPACE_PATH = "/tmp/workspace"

class CloneRequest(BaseModel):
    url: str

class FileReadRequest(BaseModel):
    filepath: str

class FileWriteRequest(BaseModel):
    filepath: str
    content: str

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Cloud IDE Backend"}

@app.post("/clone")
def clone_repository(payload: CloneRequest):
    try:
        if os.path.exists(WORKSPACE_PATH):
            shutil.rmtree(WORKSPACE_PATH)
        os.makedirs(WORKSPACE_PATH, exist_ok=True)
        shutil.rmtree(WORKSPACE_PATH) # Git requires empty dir
        
        print(f"Cloning {payload.url}...")
        git.Repo.clone_from(payload.url, WORKSPACE_PATH)
        return {"status": "success"}
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files")
def list_files():
    """Recursively lists all files in the workspace, ignoring .git"""
    files = []
    if not os.path.exists(WORKSPACE_PATH):
        return {"files": []}
        
    for root, dirs, filenames in os.walk(WORKSPACE_PATH):
        # Filter out .git directories
        if ".git" in dirs:
            dirs.remove(".git")
            
        for filename in filenames:
            if filename.startswith(".git"): continue
            
            full_path = os.path.join(root, filename)
            rel_path = os.path.relpath(full_path, WORKSPACE_PATH)
            files.append(rel_path)
            
    return {"files": sorted(files)}

@app.post("/read")
def read_file(payload: FileReadRequest):
    """Reads content of a file"""
    full_path = os.path.join(WORKSPACE_PATH, payload.filepath)
    
    # Security: Ensure path is within workspace
    if not os.path.commonpath([WORKSPACE_PATH, full_path]).startswith(WORKSPACE_PATH):
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content}
    except UnicodeDecodeError:
        return {"content": "<< Binary File >>"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Add this to the bottom of backend/app/main.py

@app.post("/write")
def write_file(payload: FileWriteRequest):
    """Overwrites the file with new content"""
    full_path = os.path.join(WORKSPACE_PATH, payload.filepath)
    
    # Security: Ensure path is within workspace
    if not os.path.commonpath([WORKSPACE_PATH, full_path]).startswith(WORKSPACE_PATH):
        raise HTTPException(status_code=403, detail="Access denied")
        
    try:
        # Ensure directory exists (in case creating a new file)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(payload.content)
            
        return {"status": "success", "message": "File saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))