// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import ProjectLoader from './components/ProjectLoader';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import MenuBar from './components/MenuBar';
import api from './utils/api';
import { TerminalSquare, Settings, X } from 'lucide-react';
import { applyTheme, getSavedTheme, Theme } from './utils/theme';

const App: React.FC = () => {
  // Track whether a workspace has been initialized so we can swap from the loader.
  const [isLoaded, setIsLoaded] = useState(false);
  // The filepath currently being edited in the code pane.
  const [activeFile, setActiveFile] = useState<string | null>(null);

  // Editor appearance and behavior preferences.
  const [currentTheme, setCurrentTheme] = useState<Theme>('dark');
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    wordWrap: false,
    minimap: false,
  });

  // State for the built-in terminal drawer and its draggable height.
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [isDragging, setIsDragging] = useState(false);
  
  // Whether the theme picker overlay is visible.
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    // Apply whichever theme the user last selected when the app loads.
    const saved = getSavedTheme();
    setCurrentTheme(saved);
    applyTheme(saved);

    // Check whether a workspace already exists for this session.
    const checkSession = async () => {
      try {
        // If this returns 200, we have files -> Load IDE
        await api.get('/files');
        setIsLoaded(true); 
      } catch (err) {
        // If this returns 404 (from our backend fix), we show the Project Loader
        setIsLoaded(false); 
      }
    };
    checkSession();
  }, []);

  const handleThemeChange = (t: Theme) => {
    setCurrentTheme(t);
    applyTheme(t);
  };

  // Dragging Logic for Terminal Resize
  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsDragging(true);
    
    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newHeight = window.innerHeight - mouseMoveEvent.clientY;
      // Limit height between 100px and 80% of screen
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

  // If the backend returned 404 on /files, we show the Loader
  if (!isLoaded) {
    return <ProjectLoader onProjectLoaded={() => setIsLoaded(true)} />;
  }

  return (
    <div className="flex h-screen w-screen bg-ide-bg text-ide-text overflow-hidden flex-col font-sans transition-colors duration-200">
      
      {/* Top Menu Bar */}
      <MenuBar 
        onReset={() => setIsLoaded(false)} 
        // Note: Change localhost to your actual domain if deployed remotely
        onUpdateSettings={(key, val) => setEditorSettings(prev => ({ ...prev, [key]: val }))}
        settings={editorSettings}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="flex flex-col h-full border-r border-ide-border bg-ide-sidebar relative">
           <div className="flex-1 overflow-hidden">
             <FileExplorer onFileSelect={setActiveFile} selectedFile={activeFile} />
           </div>
           
           {/* Theme Button (Sidebar Footer) */}
           <div className="p-2 border-t border-ide-border">
             <button 
                onClick={() => setIsSettingsOpen(true)} 
                className="w-full p-2 hover:bg-ide-activity rounded text-ide-dim hover:text-ide-text flex items-center justify-center gap-2 text-xs"
             >
               <Settings size={14} /> Theme
             </button>
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
          <CodeEditor activeFile={activeFile} theme={currentTheme} settings={editorSettings} />
        </div>
      </div>

      {/* Terminal Resizer Handle */}
      {isTerminalOpen && (
        <div 
          onMouseDown={startResizing} 
          className="h-1 bg-ide-border hover:bg-ide-accent cursor-row-resize w-full flex-shrink-0 z-40 transition-colors" 
        />
      )}

      {/* Terminal Pane */}
      <div 
        style={{ height: isTerminalOpen ? `${terminalHeight}px` : '0px' }}
        className={`flex-shrink-0 bg-ide-bg overflow-hidden border-t border-ide-border ${isDragging ? '' : 'transition-[height] duration-300'}`}
      >
        {/* Pass theme prop to Terminal so it updates colors */}
        <Terminal 
            isOpen={isTerminalOpen} 
            onClose={() => setIsTerminalOpen(false)} 
            theme={currentTheme}
        />
      </div>

      {/* Theme Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-ide-sidebar border border-ide-border p-6 rounded-lg w-80 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-ide-text">Theme Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-ide-text"><X size={18}/></button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {(['dark', 'light', 'midnight'] as Theme[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleThemeChange(t)}
                  className={`
                    p-2 rounded text-xs border capitalize
                    ${currentTheme === t ? 'border-ide-accent bg-ide-accent/10 text-ide-accent' : 'border-ide-border text-ide-dim hover:bg-ide-activity'}
                  `}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;