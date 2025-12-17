import React, { useState, useRef, useEffect } from 'react';
import {
  Cloud,
  Download,
  FilePlus,
  Type,
  WrapText,
  Map,
  Skull,
  GitBranch,
  File,
  Terminal as TerminalIcon,
  RotateCw,
} from 'lucide-react';
import api from '../utils/api';

interface MenuBarProps {
  onNewProject: () => void;
  onCloneRepo: () => void;
  onOpenTerminal: () => void;
  onRestartTerminal: () => void;
  settings: {
    fontSize: number;
    wordWrap: boolean;
    minimap: boolean;
  };
  onUpdateSettings: (key: string, value: any) => void;
}

const MenuBar: React.FC<MenuBarProps> = ({
  onNewProject,
  onCloneRepo,
  onOpenTerminal,
  onRestartTerminal,
  settings,
  onUpdateSettings,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleMenu = (menu: string) => setActiveMenu(activeMenu === menu ? null : menu);

  const handleDownload = () => {
    const sessionId = localStorage.getItem('clouide_session_id');
    if (sessionId) {
      window.open(`/download?session_id=${sessionId}`, '_blank');
    }
  };

  const handleKillTerminals = async () => {
    if (confirm('Kill all active terminal processes? This will stop any running commands.')) {
      try {
        await api.post('/terminals/kill');
        onRestartTerminal(); // Also restart the UI to reconnect immediately
      } catch (err) {
        console.error('Failed to kill terminals', err);
      }
    }
  };

  return (
    <div
      className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center px-2 select-none z-50 transition-colors duration-200"
      ref={menuRef}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mr-2">
        <Cloud size={16} className="text-ide-accent" />
        <span className="font-bold text-xs tracking-wider text-ide-text">CLOUIDE</span>
      </div>

      {/* File Menu */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('file')}
          className={`px-3 py-1 text-xs hover:bg-ide-activity rounded transition-colors ${activeMenu === 'file' ? 'bg-ide-activity text-ide-text' : 'text-ide-dim'}`}
        >
          File
        </button>
        {activeMenu === 'file' && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-ide-sidebar border border-ide-border rounded shadow-xl py-1 z-50">
            <div className="px-4 py-1 text-[10px] uppercase text-ide-dim font-bold tracking-wider">
              New / Open
            </div>

            <button
              onClick={() => {
                onNewProject();
                setActiveMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-xs text-ide-text hover:bg-ide-accent/10 hover:text-ide-accent flex items-center gap-2 transition-colors"
            >
              <File size={12} /> New Project...
            </button>

            <button
              onClick={() => {
                onCloneRepo();
                setActiveMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-xs text-ide-text hover:bg-ide-accent/10 hover:text-ide-accent flex items-center gap-2 transition-colors"
            >
              <GitBranch size={12} /> Clone Repository...
            </button>

            <div className="h-px bg-ide-border my-1" />

            <button
              onClick={handleDownload}
              className="w-full text-left px-4 py-2 text-xs text-ide-text hover:bg-ide-accent/10 hover:text-ide-accent flex items-center gap-2 transition-colors"
            >
              <Download size={12} /> Download Code
            </button>
          </div>
        )}
      </div>

      {/* View Menu */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('view')}
          className={`px-3 py-1 text-xs hover:bg-ide-activity rounded transition-colors ${activeMenu === 'view' ? 'bg-ide-activity text-ide-text' : 'text-ide-dim'}`}
        >
          View
        </button>
        {activeMenu === 'view' && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-ide-sidebar border border-ide-border rounded shadow-xl py-1 z-50">
            <div className="px-4 py-1 text-[10px] uppercase text-ide-dim font-bold tracking-wider">
              Editor Settings
            </div>

            <div className="px-4 py-2 flex items-center justify-between hover:bg-ide-activity transition-colors">
              <div className="flex items-center gap-2 text-xs text-ide-text">
                <Type size={12} /> Font Size
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateSettings('fontSize', Math.max(10, settings.fontSize - 1))}
                  className="w-5 h-5 flex items-center justify-center bg-ide-bg rounded border border-ide-border text-xs hover:border-ide-accent"
                >
                  -
                </button>
                <span className="text-xs w-4 text-center text-ide-text">{settings.fontSize}</span>
                <button
                  onClick={() => onUpdateSettings('fontSize', Math.min(24, settings.fontSize + 1))}
                  className="w-5 h-5 flex items-center justify-center bg-ide-bg rounded border border-ide-border text-xs hover:border-ide-accent"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={() => onUpdateSettings('wordWrap', !settings.wordWrap)}
              className="w-full text-left px-4 py-2 text-xs text-ide-text hover:bg-ide-activity flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <WrapText size={12} /> Word Wrap
              </div>
              {settings.wordWrap && <div className="w-2 h-2 rounded-full bg-ide-accent" />}
            </button>

            <button
              onClick={() => onUpdateSettings('minimap', !settings.minimap)}
              className="w-full text-left px-4 py-2 text-xs text-ide-text hover:bg-ide-activity flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Map size={12} /> Minimap
              </div>
              {settings.minimap && <div className="w-2 h-2 rounded-full bg-ide-accent" />}
            </button>
          </div>
        )}
      </div>

      {/* NEW: Terminal Menu */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('terminal')}
          className={`px-3 py-1 text-xs hover:bg-ide-activity rounded transition-colors ${activeMenu === 'terminal' ? 'bg-ide-activity text-ide-text' : 'text-ide-dim'}`}
        >
          Terminal
        </button>
        {activeMenu === 'terminal' && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-ide-sidebar border border-ide-border rounded shadow-xl py-1 z-50">
            <button
              onClick={() => {
                onOpenTerminal();
                setActiveMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-xs text-ide-text hover:bg-ide-activity flex items-center gap-2 transition-colors"
            >
              <TerminalIcon size={12} /> Open Terminal
            </button>
            <button
              onClick={() => {
                onRestartTerminal();
                setActiveMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-xs text-ide-text hover:bg-ide-activity flex items-center gap-2 transition-colors"
            >
              <RotateCw size={12} /> Restart Terminal
            </button>
            <div className="h-px bg-ide-border my-1" />
            <button
              onClick={handleKillTerminals}
              className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
            >
              <Skull size={12} /> Kill Terminal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuBar;
