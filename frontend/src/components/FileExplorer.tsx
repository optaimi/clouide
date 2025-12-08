// frontend/src/components/FileExplorer.tsx
import React, { useEffect, useState } from 'react';
import { FileCode, RefreshCw, FilePlus, Trash2, Edit2 } from 'lucide-react';
import axios from 'axios';

interface FileExplorerProps {
  onFileSelect: (filepath: string) => void;
  selectedFile: string | null;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect, selectedFile }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Fetch Files
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

  useEffect(() => { fetchFiles(); }, []);

  // 2. Create New File
  const handleNewFile = async () => {
    const filename = window.prompt("Enter new file name (e.g., src/utils.ts):");
    if (!filename) return;

    try {
      // Create empty file using /write endpoint
      await axios.post('/write', { filepath: filename, content: "" });
      await fetchFiles();
      onFileSelect(filename); // Open the new file
    } catch (err: any) {
      alert("Error creating file: " + (err.response?.data?.detail || err.message));
    }
  };

  // 3. Rename File
  const handleRename = async () => {
    if (!selectedFile) return;
    
    const newName = window.prompt("Rename file to:", selectedFile);
    if (!newName || newName === selectedFile) return;

    try {
      await axios.post('/rename', { old_path: selectedFile, new_path: newName });
      await fetchFiles();
      onFileSelect(newName); // Select the new name
    } catch (err: any) {
      alert("Error renaming file: " + (err.response?.data?.detail || err.message));
    }
  };

  // 4. Delete File
  const handleDelete = async () => {
    if (!selectedFile) return;
    
    if (!window.confirm(`Are you sure you want to delete '${selectedFile}'?`)) return;

    try {
      await axios.post('/delete', { filepath: selectedFile });
      await fetchFiles();
      onFileSelect(""); // Deselect
    } catch (err: any) {
      alert("Error deleting file: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="w-64 bg-[#252526] h-full border-r border-[#1e1e1e] flex flex-col">
      {/* Header */}
      <div className="p-3 bg-[#252526] border-b border-[#1e1e1e]">
        <div className="flex justify-between items-center text-[#cccccc] mb-2">
          <span className="uppercase text-xs font-bold tracking-wider">Explorer</span>
          <button onClick={fetchFiles} className="hover:bg-[#333] p-1 rounded" title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex gap-1">
          <button 
            onClick={handleNewFile}
            className="flex-1 bg-[#333] hover:bg-[#444] text-[#cccccc] py-1 rounded text-xs flex justify-center"
            title="New File"
          >
            <FilePlus size={14} />
          </button>
          <button 
            onClick={handleRename}
            disabled={!selectedFile}
            className="flex-1 bg-[#333] hover:bg-[#444] disabled:opacity-30 text-[#cccccc] py-1 rounded text-xs flex justify-center"
            title="Rename Selected"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={handleDelete}
            disabled={!selectedFile}
            className="flex-1 bg-[#333] hover:bg-red-900/50 disabled:opacity-30 text-[#cccccc] py-1 rounded text-xs flex justify-center"
            title="Delete Selected"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      {/* File List */}
      <div className="flex-1 overflow-y-auto pt-2">
        {files.length === 0 && !loading && (
          <div className="text-center text-xs text-[#666] mt-4">No files found</div>
        )}
        
        {files.map((file) => (
          <div
            key={file}
            onClick={() => onFileSelect(file)}
            className={`
              px-4 py-1 cursor-pointer text-sm flex items-center gap-2 select-none
              ${selectedFile === file ? 'bg-[#37373d] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'}
            `}
          >
            <FileCode size={14} className="opacity-60 flex-shrink-0" />
            <span className="truncate">{file}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;