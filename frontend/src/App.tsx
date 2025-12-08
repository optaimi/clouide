// frontend/src/App.tsx
import React, { useState } from 'react';
import ProjectLoader from './components/ProjectLoader';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal'; // Import Terminal
import { TerminalSquare } from 'lucide-react';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true); // Default to open

  if (!isLoaded) {
    return <ProjectLoader onProjectLoaded={() => setIsLoaded(true)} />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <FileExplorer 
          onFileSelect={(filepath) => setActiveFile(filepath)} 
          selectedFile={activeFile}
        />
        
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col h-full min-w-0">
          {/* Editor Header */}
          <div className="h-9 bg-[#1e1e1e] border-b border-[#252526] flex items-center px-4 text-sm justify-between">
            <span>{activeFile || "Welcome"}</span>
            <button 
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className={`p-1 rounded ${isTerminalOpen ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[#333]'}`}
              title="Toggle Terminal"
            >
              <TerminalSquare size={16} />
            </button>
          </div>
          
          {/* Editor */}
          <CodeEditor activeFile={activeFile} />
        </div>
      </div>

      {/* Terminal Panel (Fixed at bottom) */}
      <div className={`${isTerminalOpen ? 'h-64' : 'h-0'} transition-all duration-300 ease-in-out`}>
        <Terminal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />
      </div>
    </div>
  );
};

export default App;