// frontend/src/App.tsx
import React, { useState } from 'react';
import ProjectLoader from './components/ProjectLoader';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import { TerminalSquare } from 'lucide-react';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  
  // Terminal State
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(250); // Start at 250px
  const [isDragging, setIsDragging] = useState(false);

  // Handle Dragging
  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsDragging(true);

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      // Calculate new height: Window Height - Mouse Y Position
      const newHeight = window.innerHeight - mouseMoveEvent.clientY;
      
      // Constraints: Min 100px, Max 80% of screen
      if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
        setTerminalHeight(newHeight);
      }
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

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
          <div className="h-9 bg-[#1e1e1e] border-b border-[#252526] flex items-center px-4 text-sm justify-between flex-shrink-0">
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

      {/* Terminal Resizer Handle */}
      {isTerminalOpen && (
        <div 
          onMouseDown={startResizing}
          className="h-1 bg-[#1e1e1e] hover:bg-[#007acc] cursor-row-resize transition-colors w-full flex-shrink-0 z-50"
        />
      )}

      {/* Terminal Panel */}
      <div 
        style={{ height: isTerminalOpen ? `${terminalHeight}px` : '0px' }}
        className={`flex-shrink-0 bg-[#1e1e1e] overflow-hidden ${isDragging ? '' : 'transition-[height] duration-300 ease-in-out'}`}
      >
        <Terminal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />
      </div>
    </div>
  );
};

export default App;