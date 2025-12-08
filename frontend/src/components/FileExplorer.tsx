// frontend/src/components/FileExplorer.tsx
import React, { useEffect, useState } from 'react';
import { FileCode, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface FileExplorerProps {
  onFileSelect: (filepath: string) => void;
  selectedFile: string | null;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect, selectedFile }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/files');
      setFiles(res.data.files);
    } catch (err) {
      console.error("Failed to load files", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="w-64 bg-[#252526] h-full border-r border-[#1e1e1e] flex flex-col">
      <div className="p-3 uppercase text-xs font-bold text-[#cccccc] flex justify-between items-center tracking-wider">
        <span>Explorer</span>
        <button onClick={fetchFiles} className="hover:bg-[#333] p-1 rounded">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
      
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
    </div>
  );
};

export default FileExplorer;