// frontend/src/components/FileExplorer.tsx
import React, { useEffect, useState } from 'react';
import { FileCode, RefreshCw, UploadCloud } from 'lucide-react'; // Import UploadCloud
import axios from 'axios';
import PushModal from './PushModal'; // Import the new modal

// ... (Keep your interface and existing state logic the same) ...

const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect, selectedFile }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPushOpen, setIsPushOpen] = useState(false); // New State

  // ... (Keep fetchFiles and useEffect the same) ...
  const fetchFiles = async () => {
      // ... (your existing fetch logic) ...
      // Just declaring it here so you know where we are in the file
      try {
        const res = await axios.get('/files');
        setFiles(res.data.files);
      } catch (err) {}
  };

  useEffect(() => { fetchFiles(); }, []);

  return (
    <div className="w-64 bg-[#252526] h-full border-r border-[#1e1e1e] flex flex-col">
      {/* Header */}
      <div className="p-3 uppercase text-xs font-bold text-[#cccccc] flex justify-between items-center tracking-wider">
        <span>Explorer</span>
        <button onClick={fetchFiles} className="hover:bg-[#333] p-1 rounded">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      
      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file}
            onClick={() => onFileSelect(file)}
            className={`
              px-4 py-1 cursor-pointer text-sm flex items-center gap-2
              ${selectedFile === file ? 'bg-[#37373d] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'}
            `}
          >
            <FileCode size={14} className="opacity-60" />
            <span className="truncate">{file}</span>
          </div>
        ))}
      </div>

      {/* NEW: Push Button at the bottom */}
      <div className="p-3 border-t border-[#1e1e1e]">
        <button 
          onClick={() => setIsPushOpen(true)}
          className="w-full bg-[#333] hover:bg-[#444] text-white text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors"
        >
          <UploadCloud size={14} />
          Sync to GitHub
        </button>
      </div>

      {/* Modal */}
      <PushModal isOpen={isPushOpen} onClose={() => setIsPushOpen(false)} />
    </div>
  );
};

export default FileExplorer;