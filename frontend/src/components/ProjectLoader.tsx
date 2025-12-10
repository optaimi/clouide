// frontend/src/components/ProjectLoader.tsx
import React, { useState } from 'react';
import { GitBranch, Loader2, FilePlus, ArrowLeft, Cloud } from 'lucide-react';
import axios from 'axios';

interface ProjectLoaderProps {
  onProjectLoaded: () => void;
}

const ProjectLoader: React.FC<ProjectLoaderProps> = ({ onProjectLoaded }) => {
  const [view, setView] = useState<'menu' | 'clone'>('menu');
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Handle "New Project" (Empty Workspace)
  const handleNewProject = async () => {
    setIsLoading(true);
    try {
      // Clear workspace on backend
      await axios.post('/init');
      onProjectLoaded();
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize workspace");
      setIsLoading(false);
    }
  };

  // 2. Handle "Clone"
  const handleClone = async () => {
    if (!repoUrl) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await axios.post('/clone', { url: repoUrl });
      onProjectLoaded();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to clone repository');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-ide-bg text-ide-text transition-colors duration-200">
      <div className="w-full max-w-2xl p-8">
        
        {/* BRANDING HEADER - Replaces the old "Nebula" header */}
        <div className="flex flex-col items-center mb-12">
          <div className="p-4 bg-ide-accent/10 rounded-full mb-4">
            <Cloud size={48} className="text-ide-accent" />
          </div>
          <h1 className="text-4xl font-bold text-ide-text mb-2 tracking-tight">Clouide</h1>
          <p className="text-ide-dim">Cloud Native Development Environment</p>
        </div>

        {view === 'menu' ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Option A: New Project */}
            <button
              onClick={handleNewProject}
              disabled={isLoading}
              className="group relative p-8 bg-ide-sidebar hover:bg-ide-activity/50 border border-ide-border rounded-xl transition-all hover:border-ide-accent text-left"
            >
              <div className="p-4 bg-ide-activity w-fit rounded-lg mb-4 group-hover:bg-ide-accent/20 transition-colors">
                <FilePlus size={32} className="text-ide-text group-hover:text-ide-accent" />
              </div>
              <h3 className="text-xl font-bold text-ide-text mb-2">New Project</h3>
              <p className="text-sm text-ide-dim">
                Start with an empty workspace. You can initialize Git or pull changes later.
              </p>
              {isLoading && (
                <div className="absolute inset-0 bg-ide-sidebar/80 flex items-center justify-center rounded-xl">
                  <Loader2 className="animate-spin text-ide-accent" />
                </div>
              )}
            </button>

            {/* Option B: Clone Repo */}
            <button
              onClick={() => setView('clone')}
              className="group p-8 bg-ide-sidebar hover:bg-ide-activity/50 border border-ide-border rounded-xl transition-all hover:border-[#a174ff] text-left"
            >
              <div className="p-4 bg-ide-activity w-fit rounded-lg mb-4 group-hover:bg-[#a174ff]/20 transition-colors">
                <GitBranch size={32} className="text-ide-text group-hover:text-[#a174ff]" />
              </div>
              <h3 className="text-xl font-bold text-ide-text mb-2">Open Repository</h3>
              <p className="text-sm text-ide-dim">
                Clone an existing project from GitHub or another Git provider.
              </p>
            </button>
          </div>
        ) : (
          /* Clone View */
          <div className="max-w-md mx-auto bg-ide-sidebar p-8 rounded-xl border border-ide-border shadow-2xl relative">
            <button 
              onClick={() => { setView('menu'); setError(null); }}
              className="absolute top-4 left-4 p-2 hover:bg-ide-activity rounded-full text-ide-dim hover:text-ide-text transition-colors"
            >
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
                className="w-full px-4 py-3 bg-ide-bg border border-ide-border rounded focus:outline-none focus:border-[#a174ff] text-ide-text placeholder-ide-dim/50 transition-colors"
              />

              {error && (
                <div className="text-red-400 text-xs bg-red-400/10 p-3 rounded border border-red-400/20">
                  {error}
                </div>
              )}

              <button
                onClick={handleClone}
                disabled={isLoading || !repoUrl}
                className="w-full py-3 bg-[#a174ff] hover:bg-[#8854e0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Cloning...</span>
                  </>
                ) : (
                  <span>Clone Project</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectLoader;