type: uploaded file
fileName: optaimi/clouide/optaimi-Clouide-52b704295fa97990c607eaae8a7e7e8a54540950/frontend/src/App.tsx
fullContent:
import React, { useState, useEffect } from 'react';
import ProjectLoader from './components/ProjectLoader';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';
import Terminal from './components/Terminal';
import MenuBar from './components/MenuBar';
import WelcomeScreen from './components/WelcomeScreen';
import api from './utils/api';
import { TerminalSquare, Settings, X, Loader2, Play } from 'lucide-react';
import { applyTheme, getSavedTheme, Theme } from './utils/theme';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);

  // Editor settings
  const [currentTheme, setCurrentTheme] = useState<Theme>('dark');
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    wordWrap: false,
    minimap: false,
  });

  // UI State
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [isDragging, setIsDragging] = useState(false);
  const [terminalKey, setTerminalKey] = useState(0); // Force terminal remount
  
  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [modalType, setModalType] = useState<'new' | 'clone' | null>(null);
  
  // Modal Input State
  const [newProjectName, setNewProjectName] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    const saved = getSavedTheme();
    setCurrentTheme(saved);
    applyTheme(saved);

    const checkSession = async () => {
      try {
        await api.get('/files');
        handleProjectLoaded();
      } catch (err) {
        setIsLoaded(false); 
      }
    };
    checkSession();

    // Global Keyboard Shortcut for Terminal Toggle (Ctrl + `)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleProjectLoaded = () => {
    setIsLoaded(true);
    // Show Welcome.Clouide if it exists, otherwise just clean state
    setActiveFile('Welcome.Clouide');
    setOpenFiles(['Welcome.Clouide']);
    setModalType(null);
    setNewProjectName('');
    setCloneUrl('');
    setModalError(null);
    // Force terminal restart to connect to new shell
    setTerminalKey(k => k + 1);
  };

  const handleFileOpen = (file: string) => {
    if (!openFiles.includes(file)) setOpenFiles(prev => [...prev, file]);
    setActiveFile(file);
  };

  const handleTabClose = (e: React.MouseEvent, file: string) => {
    e.stopPropagation();
    const newFiles = openFiles.filter(f => f !== file);
    setOpenFiles(newFiles);
    if (activeFile === file) {
      setActiveFile(newFiles.length > 0 ? newFiles[newFiles.length - 1] : null);
    }
  };

  const handleThemeChange = (t: Theme) => {
    setCurrentTheme(t);
    applyTheme(t);
  };

  // --- Run Code Logic ---
  const handleRunCode = () => {
    if (!activeFile) return;
    
    // Ensure terminal is open
    if (!isTerminalOpen) setIsTerminalOpen(true);

    let command = '';
    const ext = activeFile.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'php': command = `php "${activeFile}"`; break;
      case 'py': command = `python3 "${activeFile}"`; break;
      case 'js': command = `node "${activeFile}"`; break;
      case 'ts': command = `npx tsx "${activeFile}"`; break;
      case 'sh': command = `bash "${activeFile}"`; break;
      default: 
        command = `echo "No runner configured for .${ext} files"`;
    }

    // Dispatch event to Terminal component
    window.dispatchEvent(new CustomEvent('clouide:run-command', { detail: command }));
  };

  // --- Modal Logic ---
  const executeNewProject = async () => {
    setModalLoading(true);
    setModalError(null);
    try {
      let finalName = newProjectName.trim();
      if (!finalName) {
         const sessionId = localStorage.getItem('clouide_session_id') || 'unknown';
         finalName = `project-${sessionId.substring(0, 5)}-${Date.now()}`;
      }
      await api.post('/init', { project_name: finalName });
      handleProjectLoaded();
      window.location.reload(); 
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to create project");
    } finally {
      setModalLoading(false);
    }
  };

  const executeClone = async () => {
    if (!cloneUrl) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await api.post('/clone', { url: cloneUrl });
      handleProjectLoaded();
      window.location.reload();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to clone repository");
    } finally {
      setModalLoading(false);
    }
  };

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsDragging(true);
    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newHeight = window.innerHeight - mouseMoveEvent.clientY;
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
    return <ProjectLoader onProjectLoaded={handleProjectLoaded} />;
  }

  return (
    <div className="flex h-screen w-screen bg-ide-bg text-ide-text overflow-hidden flex-col font-sans transition-colors duration-200 relative">
      
      {/* Top Menu Bar */}
      <MenuBar 
        onNewProject={() => setModalType('new')}
        onCloneRepo={() => setModalType('clone')}
        onOpenTerminal={() => setIsTerminalOpen(true)}
        onRestartTerminal={() => setTerminalKey(k => k + 1)}
        onUpdateSettings={(key, val) => setEditorSettings(prev => ({ ...prev, [key]: val }))}
        settings={editorSettings}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="flex flex-col h-full border-r border-ide-border bg-ide-sidebar relative">
           <div className="flex-1 overflow-hidden">
             <FileExplorer onFileSelect={handleFileOpen} selectedFile={activeFile} />
           </div>
           <div className="p-2 border-t border-ide-border">
             <button onClick={() => setIsSettingsOpen(true)} className="w-full p-2 hover:bg-ide-activity rounded text-ide-dim hover:text-ide-text flex items-center justify-center gap-2 text-xs">
               <Settings size={14} /> Theme
             </button>
           </div>
        </div>
        
        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-ide-bg">
          {/* Tab Bar */}
          {openFiles.length > 0 && (
            <div className="flex items-center bg-ide-sidebar border-b border-ide-border overflow-x-auto no-scrollbar">
              {openFiles.map(file => (
                <div 
                  key={file}
                  onClick={() => setActiveFile(file)}
                  className={`
                    group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer border-r border-ide-border min-w-[120px] max-w-[200px] select-none
                    ${activeFile === file ? 'bg-ide-bg text-ide-text border-t-2 border-t-ide-accent' : 'text-ide-dim hover:bg-ide-activity'}
                  `}
                >
                  <span className="truncate flex-1">{file.split('/').pop()}</span>
                  <button 
                    onClick={(e) => handleTabClose(e, file)}
                    className={`opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-ide-bg hover:text-red-400 ${activeFile === file ? 'opacity-100' : ''}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="h-9 bg-ide-bg border-b border-ide-border flex items-center px-4 text-sm justify-between flex-shrink-0">
            <span className="opacity-80">{activeFile || "Welcome to Clouide"}</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleRunCode}
                className="p-1 rounded hover:bg-ide-activity text-green-500 hover:text-green-400 transition-colors"
                title="Run Code"
              >
                <Play size={16} />
              </button>
              <button 
                onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                className={`p-1 rounded ${isTerminalOpen ? 'bg-ide-accent/20 text-ide-accent' : 'hover:bg-ide-activity'}`}
                title="Toggle Terminal"
              >
                <TerminalSquare size={16} />
              </button>
            </div>
          </div>
          
          {activeFile === 'Welcome.Clouide' ? (
             <WelcomeScreen />
          ) : (
             <CodeEditor activeFile={activeFile} theme={currentTheme} settings={editorSettings} />
          )}
        </div>
      </div>

      {isTerminalOpen && (
        <div onMouseDown={startResizing} className="h-1 bg-ide-border hover:bg-ide-accent cursor-row-resize w-full flex-shrink-0 z-40 transition-colors" />
      )}

      <div 
        style={{ height: isTerminalOpen ? `${terminalHeight}px` : '0px' }}
        className={`flex-shrink-0 bg-ide-bg overflow-hidden border-t border-ide-border ${isDragging ? '' : 'transition-[height] duration-300'}`}
      >
        <Terminal key={terminalKey} isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} theme={currentTheme} />
      </div>

      {/* --- IN-PAGE MODALS --- */}

      {/* New Project Modal */}
      {modalType === 'new' && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
          <div className="bg-ide-sidebar border border-ide-border p-6 rounded-lg w-96 shadow-2xl">
            <h2 className="text-xl font-bold text-ide-text mb-4">Create New Project</h2>
            <p className="text-sm text-ide-dim mb-4">This will clear your current workspace.</p>
            <input 
              type="text" 
              placeholder="Project Name (Optional)" 
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 bg-ide-bg border border-ide-border rounded mb-4 text-ide-text focus:border-ide-accent focus:outline-none"
            />
            {modalError && <div className="text-red-400 text-xs mb-4">{modalError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalType(null)} className="px-4 py-2 text-sm text-ide-dim hover:text-ide-text">Cancel</button>
              <button onClick={executeNewProject} disabled={modalLoading} className="px-4 py-2 text-sm bg-ide-accent hover:bg-ide-accent/80 text-white rounded flex items-center gap-2">
                {modalLoading && <Loader2 size={14} className="animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Repo Modal */}
      {modalType === 'clone' && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
          <div className="bg-ide-sidebar border border-ide-border p-6 rounded-lg w-96 shadow-2xl">
            <h2 className="text-xl font-bold text-ide-text mb-4">Clone Repository</h2>
            <p className="text-sm text-ide-dim mb-4">Enter a public git URL. This will clear your current workspace.</p>
            <input 
              type="text" 
              placeholder="[https://github.com/username/repo.git](https://github.com/username/repo.git)" 
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              className="w-full px-3 py-2 bg-ide-bg border border-ide-border rounded mb-4 text-ide-text focus:border-ide-accent focus:outline-none"
            />
            {modalError && <div className="text-red-400 text-xs mb-4">{modalError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalType(null)} className="px-4 py-2 text-sm text-ide-dim hover:text-ide-text">Cancel</button>
              <button onClick={executeClone} disabled={modalLoading || !cloneUrl} className="px-4 py-2 text-sm bg-[#a174ff] hover:bg-[#8854e0] text-white rounded flex items-center gap-2">
                {modalLoading && <Loader2 size={14} className="animate-spin" />} Clone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
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
                  className={`p-2 rounded text-xs border capitalize ${currentTheme === t ? 'border-ide-accent bg-ide-accent/10 text-ide-accent' : 'border-ide-border text-ide-dim hover:bg-ide-activity'}`}
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