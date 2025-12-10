// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import ProjectLoader from './components/ProjectLoader';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import { TerminalSquare, Settings, X, Moon, Sun, Cloud } from 'lucide-react'; // Added Cloud icon
import { applyTheme, getSavedTheme, Theme } from './utils/theme';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('dark');

  // Load Theme on Start
  useEffect(() => {
    const saved = getSavedTheme();
    setCurrentTheme(saved);
    applyTheme(saved);
  }, []);

  const handleThemeChange = (t: Theme) => {
    setCurrentTheme(t);
    applyTheme(t);
  };

  // Dragging Logic (Same as before)
  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsDragging(true);
    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newHeight = window.innerHeight - mouseMoveEvent.clientY;
      if (newHeight > 100 && newHeight < window.innerHeight * 0.8) setTerminalHeight(newHeight);
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
    return (
      <>
        {/* Pass theme handler to loader so it looks right immediately */}
        <ProjectLoader onProjectLoaded={() => setIsLoaded(true)} />
        {/* Hidden Settings Button for Landing Page if needed, currently ProjectLoader manages itself */}
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-ide-bg text-ide-text overflow-hidden flex-col font-sans transition-colors duration-200">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="flex flex-col h-full border-r border-ide-border bg-ide-sidebar">
           {/* Sidebar Header with Settings */}
           <div className="h-9 flex items-center justify-between px-3 border-b border-ide-border">
              <span className="font-bold text-xs tracking-wider uppercase text-ide-dim flex items-center gap-2">
                <Cloud size={14} className="text-ide-accent" /> Clouide
              </span>
              <button onClick={() => setIsSettingsOpen(true)} className="text-ide-dim hover:text-ide-text">
                <Settings size={14} />
              </button>
           </div>
           
           <div className="flex-1 overflow-hidden">
             <FileExplorer onFileSelect={setActiveFile} selectedFile={activeFile} />
           </div>
        </div>
        
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-ide-bg">
          <div className="h-9 bg-ide-bg border-b border-ide-border flex items-center px-4 text-sm justify-between flex-shrink-0">
            <span className="opacity-80">{activeFile || "Welcome to Clouide"}</span>
            <button 
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className={`p-1 rounded ${isTerminalOpen ? 'bg-ide-accent/20 text-ide-accent' : 'hover:bg-ide-activity'}`}
              title="Toggle Terminal"
            >
              <TerminalSquare size={16} />
            </button>
          </div>
          <CodeEditor activeFile={activeFile} theme={currentTheme} />
        </div>
      </div>

      {/* Terminal Resizer */}
      {isTerminalOpen && (
        <div onMouseDown={startResizing} className="h-1 bg-ide-border hover:bg-ide-accent cursor-row-resize w-full flex-shrink-0 z-40" />
      )}

      {/* Terminal */}
      <div 
        style={{ height: isTerminalOpen ? `${terminalHeight}px` : '0px' }}
        className={`flex-shrink-0 bg-ide-bg overflow-hidden border-t border-ide-border ${isDragging ? '' : 'transition-[height] duration-300'}`}
      >
        <Terminal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-ide-sidebar border border-ide-border p-6 rounded-lg w-80 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)}><X size={18}/></button>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs uppercase text-ide-dim font-bold">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {(['dark', 'light', 'midnight'] as Theme[]).map(t => (
                  <button
                    key={t}
                    onClick={() => handleThemeChange(t)}
                    className={`
                      p-2 rounded text-xs border capitalize
                      ${currentTheme === t ? 'border-ide-accent bg-ide-accent/10 text-ide-accent' : 'border-ide-border hover:bg-ide-activity'}
                    `}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;