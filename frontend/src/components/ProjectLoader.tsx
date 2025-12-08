import React, { useState } from 'react';
import { GitBranch, Loader2 } from 'lucide-react';
import axios from 'axios';

interface ProjectLoaderProps {
  onProjectLoaded: () => void;
}

const ProjectLoader: React.FC<ProjectLoaderProps> = ({ onProjectLoaded }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClone = async () => {
    if (!repoUrl) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Direct call to backend port 8000
      await axios.post('http://localhost:8000/clone', { url: repoUrl });
      onProjectLoaded();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to clone repository');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1e1e1e] text-[#cccccc]">
      <div className="w-full max-w-md p-8 bg-[#252526] rounded-lg shadow-xl border border-black/20">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-500/10 rounded-full mb-4">
            <GitBranch size={32} className="text-[#007acc]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nebula Cloud IDE</h1>
          <p className="text-white/40 mt-2 text-sm">Enter a Git repository URL to begin</p>
        </div>

        <div className="space-y-4">
          <div>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repo.git"
              className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#333333] rounded focus:outline-none focus:border-[#007acc] text-white placeholder-white/20 transition-colors"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded">
              {error}
            </div>
          )}

          <button
            onClick={handleClone}
            disabled={isLoading || !repoUrl}
            className="w-full py-3 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Cloning...</span>
              </>
            ) : (
              <span>Clone & Start</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectLoader;
