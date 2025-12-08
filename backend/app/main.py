# backend/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import git
import shutil
import os

app = FastAPI()

# CORSMiddleware configuration
# Allow all origins for development convenience. 
# In production, you would restrict this to your Cloud Run URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global configuration
WORKSPACE_PATH = "/tmp/workspace"

class CloneRequest(BaseModel):
    url: str

@app.get("/")
def health_check():
    """Simple health check to verify server is running."""
    return {"status": "ok", "service": "Cloud IDE Backend"}

@app.post("/clone")
def clone_repository(payload: CloneRequest):
    """
    Clones a public GitHub repository into the workspace.
    WARNING: This deletes any existing data in WORKSPACE_PATH.
    """
    try:
        # 1. Clean up existing workspace to avoid conflicts
        if os.path.exists(WORKSPACE_PATH):
            shutil.rmtree(WORKSPACE_PATH)
        
        # 2. Create the directory (optional, clone_from usually handles this, 
        # but creating the parent ensures permissions are right)
        os.makedirs(WORKSPACE_PATH, exist_ok=True)
        # We actually remove it right before cloning because clone_from expects an empty or non-existent dir
        shutil.rmtree(WORKSPACE_PATH) 

        # 3. Clone the repo
        print(f"Cloning {payload.url} into {WORKSPACE_PATH}...")
        git.Repo.clone_from(payload.url, WORKSPACE_PATH)
        
        return {"status": "success", "message": f"Cloned {payload.url}"}

    except git.GitCommandError as e:
        # Handle specific Git errors (like private repos or bad URLs)
        print(f"Git Error: {e}")
        raise HTTPException(status_code=400, detail=f"Git Error: {e}")
    except Exception as e:
        # Handle generic system errors
        print(f"System Error: {e}")
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")