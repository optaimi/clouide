// frontend/src/components/PushModal.tsx
import React, { useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import axios from 'axios';

interface PushModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PushModal: React.FC<PushModalProps> = ({ isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePush = async () => {
    setLoading(true);
    setStatus(null);
    try {
      await axios.post('/push', {
        commit_message: message,
        username: username,
        github_token: token
      });
      setStatus('Success! Changes live on GitHub.');
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setStatus('Error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#252526] p-6 rounded-lg w-96 border border-[#333] shadow-2xl">
        <div className="flex justify-between items-center mb-4 text-[#cccccc]">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UploadCloud size={20} /> Push to GitHub
          </h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase text-[#888] mb-1">Commit Message</label>
            <input 
              className="w-full bg-[#1e1e1e] border border-[#333] text-white p-2 rounded text-sm"
              placeholder="Update features..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-xs uppercase text-[#888] mb-1">GitHub Username</label>
            <input 
              className="w-full bg-[#1e1e1e] border border-[#333] text-white p-2 rounded text-sm"
              placeholder="octocat"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-[#888] mb-1">
              Personal Access Token (Classic)
            </label>
            <input 
              type="password"
              className="w-full bg-[#1e1e1e] border border-[#333] text-white p-2 rounded text-sm"
              placeholder="ghp_..."
              value={token}
              onChange={e => setToken(e.target.value)}
            />
            <p className="text-[10px] text-[#666] mt-1">
              Required for auth. Token must have 'repo' scope.
            </p>
          </div>

          {status && (
            <div className={`text-xs p-2 rounded ${status.startsWith('Success') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {status}
            </div>
          )}

          <button 
            onClick={handlePush}
            disabled={loading || !token || !username}
            className="w-full bg-[#007acc] hover:bg-[#0062a3] text-white py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={16}/> : 'Push Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PushModal;