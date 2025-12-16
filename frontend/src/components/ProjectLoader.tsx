import React, { useState } from 'react';
import { GitBranch, Loader2, FilePlus, ArrowLeft, Cloud, KeyRound, TerminalSquare, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import Terminal from './Terminal';

interface ProjectLoaderProps {
  onProjectLoaded: () => void;
}

const ProjectLoader: React.FC<ProjectLoaderProps> = ({ onProjectLoaded }) => {
  // Control which section of the wizard is displayed.
  const [view, setView] = useState<'menu' | 'new_project' | 'clone' | 'login'>('menu');

  // Clone State
  const [repoUrl, setRepoUrl] = useState('');

  // New Project State
  const [projectName, setProjectName] = useState('');

  // Login State
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // 1. Handle New Project
  const handleNewProject = async () => {
    // Spin up a fresh repository populated with a basic README file.
    setIsLoading(true);
    // Generate default name if empty: session_id + timestamp
    let finalName = projectName.trim();
    if (!finalName) {
      const sessionId = localStorage.getItem('clouide_session_id') || 'unknown';
      finalName = `project-${sessionId.substring(0, 5)}-${Date.now()}`;
    }

    try {
      // Send the project name to backend to initialize README and Git
      await api.post('/init', { project_name: finalName });
      onProjectLoaded();
    } catch (err: any) {
      setError("Failed to initialize workspace");
      setIsLoading(false);
    }
  };

  // 2. Handle Clone
  const handleClone = async () => {
    // Pull a Git repository into the workspace, interpreting common errors for clarity.
    if (!repoUrl) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/clone', { url: repoUrl });
      onProjectLoaded();
    } catch (err: any) {
      console.error(err);
      let rawMsg = err.response?.data?.detail || 'Failed to clone repository';

      if (rawMsg.includes('exit code(128)') || rawMsg.includes('could not read Username')) {
        rawMsg = "Access Denied: This repository is private or does not exist. Please login.";
      } else if (rawMsg.includes('Authentication failed')) {
        rawMsg = "Authentication failed. Please check your token.";
      } else if (rawMsg.includes('already exists')) {
        rawMsg = "A project is already loaded. Please reset first.";
      }

      setError(rawMsg);
      setIsLoading(false);
    }
  };

  // 3. Handle Login
  const handleLogin = async () => {
    // Save the supplied GitHub credentials for use in later clone and push actions.
    if (!username || !token) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/login', { username, token });
      setSuccessMsg("Credentials saved! You can now clone private repos.");
      setTimeout(() => {
        setSuccessMsg(null);
        setView('clone');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-ide-bg text-ide-text transition-colors duration-200 flex-col">
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-2xl p-8">
          
          <div className="flex flex-col items-center mb-12">
            <div className="p-4 bg-ide-accent/10 rounded-full mb-4">
              <Cloud size={48} className="text-ide-accent" />
            </div>
            <h1 className="text-4xl font-bold text-ide-text mb-2 tracking-tight">Clouide</h1>
            <p className="text-ide-dim">Cloud Native Development Environment</p>
          </div>

          {view === 'menu' && (
            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={() => setView('new_project')}
                className="group relative p-8 bg-ide-sidebar hover:bg-ide-activity/50 border border-ide-border rounded-xl transition-all hover:border-ide-accent text-left"
              >
                <div className="p-4 bg-ide-activity w-fit rounded-lg mb-4 group-hover:bg-ide-accent/20 transition-colors">
                  <FilePlus size={32} className="text-ide-text group-hover:text-ide-accent" />
                </div>
                <h3 className="text-xl font-bold text-ide-text mb-2">New Project</h3>
                <p className="text-sm text-ide-dim">Start with an empty workspace.</p>
              </button>

              <button
                onClick={() => setView('clone')}
                className="group p-8 bg-ide-sidebar hover:bg-ide-activity/50 border border-ide-border rounded-xl transition-all hover:border-[#a174ff] text-left"
              >
                <div className="p-4 bg-ide-activity w-fit rounded-lg mb-4 group-hover:bg-[#a174ff]/20 transition-colors">
                  <GitBranch size={32} className="text-ide-text group-hover:text-[#a174ff]" />
                </div>
                <h3 className="text-xl font-bold text-ide-text mb-2">Open Repository</h3>
                <p className="text-sm text-ide-dim">Clone from GitHub or URL.</p>
              </button>
            </div>
          )}

          {view === 'new_project' && (
            <div className="max-w-md mx-auto bg-ide-sidebar p-8 rounded-xl border border-ide-border shadow-2xl relative">
              <button onClick={() => setView('menu')} className="absolute top-4 left-4 p-2 hover:bg-ide-activity rounded-full text-ide-dim hover:text-ide-text">
                <ArrowLeft size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="p-3 bg-ide-accent/10 rounded-full w-fit mx-auto mb-4">
                  <FilePlus size={32} className="text-ide-accent" />
                </div>
                <h2 className="text-xl font-bold text-ide-text">Setup New Project</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase font-bold text-ide-dim mb-1 block">Project Name (Optional)</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-awesome-project"
                    className="w-full px-4 py-3 bg-ide-bg border border-ide-border rounded focus:outline-none focus:border-ide-accent text-ide-text placeholder-ide-dim/50"
                  />
                  <p className="text-[10px] text-ide-dim mt-1">
                    Leave blank to use default: session-id + timestamp
                  </p>
                </div>

                {error && <div className="text-red-400 text-xs bg-red-400/10 p-3 rounded">{error}</div>}

                <button
                  onClick={handleNewProject}
                  disabled={isLoading}
                  className="w-full py-3 bg-ide-accent hover:bg-ide-accent/80 disabled:opacity-50 text-white font-medium rounded flex items-center justify-center gap-2"
                >
                  {isLoading ? <><Loader2 size={18} className="animate-spin" /> Creating...</> : 'Create Project'}
                </button>
              </div>
            </div>
          )}

          {view === 'clone' && (
            <div className="max-w-md mx-auto bg-ide-sidebar p-8 rounded-xl border border-ide-border shadow-2xl relative">
              <button onClick={() => setView('menu')} className="absolute top-4 left-4 p-2 hover:bg-ide-activity rounded-full text-ide-dim hover:text-ide-text">
                <ArrowLeft size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="p-3 bg-[#a174ff]/10 rounded-full w-fit mx-auto mb-4">
                  <GitBranch size={32} className="text-[#a174ff]" />
                </div>
                <h2 className="text-xl font-bold text-ide-text">Clone Repository</h2>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repo.git"
                  className="w-full px-4 py-3 bg-ide-bg border border-ide-border rounded focus:outline-none focus:border-[#a174ff] text-ide-text placeholder-ide-dim/50"
                />

                <div className="flex justify-end">
                  <button 
                    onClick={() => setView('login')}
                    className="text-xs text-[#a174ff] hover:underline flex items-center gap-1"
                  >
                    Private repo? Click here to login <KeyRound size={12} />
                  </button>
                </div>

                {error && <div className="text-red-400 text-xs bg-red-400/10 p-3 rounded">{error}</div>}
                {successMsg && <div className="text-green-400 text-xs bg-green-400/10 p-3 rounded flex items-center gap-2"><CheckCircle size={14} /> {successMsg}</div>}

                <button
                  onClick={handleClone}
                  disabled={isLoading || !repoUrl}
                  className="w-full py-3 bg-[#a174ff] hover:bg-[#8854e0] disabled:opacity-50 text-white font-medium rounded flex items-center justify-center gap-2"
                >
                  {isLoading ? <><Loader2 size={18} className="animate-spin" /> Cloning...</> : 'Clone Project'}
                </button>
              </div>
            </div>
          )}

          {view === 'login' && (
            <div className="max-w-md mx-auto bg-ide-sidebar p-8 rounded-xl border border-ide-border shadow-2xl relative">
              <button onClick={() => setView('clone')} className="absolute top-4 left-4 p-2 hover:bg-ide-activity rounded-full text-ide-dim hover:text-ide-text">
                <ArrowLeft size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="p-3 bg-ide-accent/10 rounded-full w-fit mx-auto mb-4">
                  <KeyRound size={32} className="text-ide-accent" />
                </div>
                <h2 className="text-xl font-bold text-ide-text">GitHub Login</h2>
                <p className="text-sm text-ide-dim mt-2">Enter your Personal Access Token (PAT)</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase font-bold text-ide-dim mb-1 block">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 bg-ide-bg border border-ide-border rounded focus:outline-none focus:border-ide-accent text-ide-text"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-ide-dim mb-1 block">Personal Access Token</label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-4 py-2 bg-ide-bg border border-ide-border rounded focus:outline-none focus:border-ide-accent text-ide-text"
                  />
                </div>

                {error && <div className="text-red-400 text-xs bg-red-400/10 p-3 rounded">{error}</div>}

                <button
                  onClick={handleLogin}
                  disabled={isLoading || !username || !token}
                  className="w-full py-3 bg-ide-accent hover:bg-ide-accent/80 disabled:opacity-50 text-white font-medium rounded flex items-center justify-center gap-2"
                >
                  {isLoading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : 'Save Credentials'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-50">
        <button 
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          className="p-3 bg-ide-sidebar border border-ide-border rounded-full shadow-lg hover:bg-ide-activity text-ide-dim hover:text-ide-text transition-all"
          title="Toggle Terminal"
        >
          <TerminalSquare size={20} />
        </button>
      </div>

      <div 
        style={{ height: isTerminalOpen ? '300px' : '0px' }}
        className="flex-shrink-0 bg-ide-bg overflow-hidden border-t border-ide-border transition-[height] duration-300 ease-in-out"
      >
        <Terminal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />
      </div>
    </div>
  );
};

export default ProjectLoader;