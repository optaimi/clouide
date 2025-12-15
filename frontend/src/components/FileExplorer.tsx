// frontend/src/components/FileExplorer.tsx
import React, { useEffect, useState } from 'react';
import { FileCode, RefreshCw, FilePlus, Trash2, Edit2 } from 'lucide-react';
import api from '../utils/api';

interface FileExplorerProps {
  onFileSelect: (filepath: string) => void;
  selectedFile: string | null;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect, selectedFile }) => {
  // List of file paths returned by the backend.
  const [files, setFiles] = useState<string[]>([]);
  // Simple flag for showing the spinning refresh icon.
  const [loading, setLoading] = useState(false);

  // 1. Fetch Files (Updated to support silent refresh)
  const fetchFiles = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/files');
      setFiles(res.data.files);
    } catch (err) {
      console.error("Failed to load files", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { 
    fetchFiles(); 
    // Auto-refresh every 2 seconds to keep file list in sync
    const interval = setInterval(() => fetchFiles(true), 2000);
    return () => clearInterval(interval);
  }, []);

  // 2. Create New File
  const handleNewFile = async () => {
    // Ask the user for a name and then create a blank file on the server.
    const filename = window.prompt("Enter new file name (e.g., src/utils.ts):");
    if (!filename) return;

    try {
      await api.post('/write', { filepath: filename, content: "" });
      await fetchFiles();
      onFileSelect(filename);
    } catch (err: any) {
      alert("Error creating file: " + (err.response?.data?.detail || err.message));
    }
  };

  // 3. Rename File
  const handleRename = async () => {
    // Rename the selected file, keeping the user focused on the same entry afterwards.
    if (!selectedFile) return;

    const newName = window.prompt("Rename file to:", selectedFile);
    if (!newName || newName === selectedFile) return;

    try {
      await api.post('/rename', { old_path: selectedFile, new_path: newName });
      await fetchFiles();
      onFileSelect(newName);
    } catch (err: any) {
      alert("Error renaming file: " + (err.response?.data?.detail || err.message));
    }
  };

  // 4. Delete File
  const handleDelete = async () => {
    // Permanently remove the selected file after a quick confirmation prompt.
    if (!selectedFile) return;
    if (!window.confirm(`Are you sure you want to delete '${selectedFile}'?`)) return;

    try {
      await api.post('/delete', { filepath: selectedFile });
      await fetchFiles();
      onFileSelect("");
    } catch (err: any) {
      alert("Error deleting file: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    // Updated to use semantic theme classes
    <div className="w-64 bg-ide-sidebar h-full border-r border-ide-border flex flex-col transition-colors duration-200">
      {/* Header */}
      <div className="p-3 bg-ide-sidebar border-b border-ide-border">
        <div className="flex justify-between items-center text-ide-text mb-2">
          <span className="uppercase text-xs font-bold tracking-wider text-ide-dim">Explorer</span>
          <button onClick={() => fetchFiles()} className="hover:bg-ide-activity p-1 rounded text-ide-text" title="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex gap-1">
          <button 
            onClick={handleNewFile}
            className="flex-1 bg-ide-activity hover:bg-ide-activity/80 text-ide-text py-1 rounded text-xs flex justify-center transition-colors"
            title="New File"
          >
            <FilePlus size={14} />
          </button>
          <button 
            onClick={handleRename}
            disabled={!selectedFile}
            className="flex-1 bg-ide-activity hover:bg-ide-activity/80 disabled:opacity-30 text-ide-text py-1 rounded text-xs flex justify-center transition-colors"
            title="Rename Selected"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={handleDelete}
            disabled={!selectedFile}
            className="flex-1 bg-ide-activity hover:bg-red-900/50 hover:text-red-400 disabled:opacity-30 text-ide-text py-1 rounded text-xs flex justify-center transition-colors"
            title="Delete Selected"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      {/* File List */}
      <div className="flex-1 overflow-y-auto pt-2">
        {files.length === 0 && !loading && (
          <div className="text-center text-xs text-ide-dim mt-4">No files found</div>
        )}
        
        {files.map((file) => (
          <div
            key={file}
            onClick={() => onFileSelect(file)}
            className={`
              px-4 py-1 cursor-pointer text-sm flex items-center gap-2 select-none transition-colors
              ${selectedFile === file 
                ? 'bg-ide-activity text-ide-text border-l-2 border-ide-accent' 
                : 'text-ide-dim hover:bg-ide-activity hover:text-ide-text'}
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