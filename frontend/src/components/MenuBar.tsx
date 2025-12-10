import React, { useState, useRef, useEffect } from 'react';
import { Cloud, ChevronDown, Download, FilePlus, LogOut, Settings, Type, WrapText, Map } from 'lucide-react';

interface MenuBarProps {
  onReset: () => void;
  onDownload: () => void;
  settings: {
    fontSize: number;
    wordWrap: boolean;
    minimap: boolean;
  };
  onUpdateSettings: (key: string, value: any) => void;
}

const MenuBar: React.FC<MenuBarProps> = ({ onReset, onDownload, settings, onUpdateSettings }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
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

  return (
    <div className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center px-2 select-none z-50" ref={menuRef}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mr-2">
        <Cloud size={16} className="text-ide-accent" />
        <span className="font-bold text-xs tracking-wider text-ide-text">CLOUIDE</span>
      </div>

      {/* File Menu */}
      <div className="relative">
        <button 
          onClick={() => toggleMenu('file')}
          className={`px-3 py-1 text-xs hover:bg-ide-activity rounded ${activeMenu === 'file' ? 'bg-ide-activity text-ide-text' : 'text-ide-dim'}`}
        >
          File
        </button>
        {activeMenu === 'file' && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-ide-sidebar border border-ide-border rounded shadow-xl py-1 z-50">
            <button onClick={onReset} className="w-full text-left px-4 py-2 text-xs text-ide-text hover:bg-ide-accent/20 hover:text-ide-accent flex items-center gap-2">
              <FilePlus size={12} /> New / Open...
            </button>
            <div className="h-px bg-ide-border my-1" />
            <button onClick={onDownload} className="w-full text-left px-4 py-2 text-xs text-ide-text hover:bg-ide-accent/20 hover:text-ide-accent flex items-center gap-2">
              <Download size={12} /> Download Code
            </button>
          </div>
        )}
      </div>

      {/* View/Settings Menu */}
      <div className="relative">
        <button 
          onClick={() => toggleMenu('view')}
          className={`px-3 py-1 text-xs hover:bg-ide-activity rounded ${activeMenu === 'view' ? 'bg-ide-activity text-ide-text' : 'text-ide-dim'}`}
        >
          View
        </button>
        {activeMenu === 'view' && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-ide-sidebar border border-ide-border rounded shadow-xl py-1 z-50">
            <div className="px-4 py-1 text-[10px] uppercase text-ide-dim font-bold tracking-wider">Editor Settings</div>
            
            {/* Font Size */}
            <div className="px-4 py-2 flex items-center justify-between hover:bg-ide-activity">
              <div className="flex items-center gap-2 text-xs text-ide-text">
                <Type size={12} /> Font Size
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onUpdateSettings('fontSize', Math.max(10, settings.fontSize - 1))}
                  className="w-5 h-5 flex items-center justify-center bg-ide-bg rounded border border-ide-border text-xs hover:border-ide-accent"
                >-</button>
                <span className="text-xs w-4 text-center text-ide-text">{settings.fontSize}</span>
                <button 
                  onClick={() => onUpdateSettings('fontSize', Math.min(24, settings.fontSize + 1))}
                  className="w-5 h-5 flex items-center justify-center bg-ide-bg rounded border border-ide-border text-xs hover:border-ide-accent"
                >+</button>
              </div>
            </div>

            {/* Word Wrap Toggle */}
            <button 
              onClick={() => onUpdateSettings('wordWrap', !settings.wordWrap)}
              className="w-full text-left px-4 py-2 text-xs text-ide-text hover:bg-ide-activity flex items-center justify-between"
            >
              <div className="flex items-center gap-2"><WrapText size={12} /> Word Wrap</div>
              {settings.wordWrap && <div className="w-2 h-2 rounded-full bg-ide-accent" />}
            </button>

            {/* Minimap Toggle */}
            <button 
              onClick={() => onUpdateSettings('minimap', !settings.minimap)}
              className="w-full text-left px-4 py-2 text-xs text-ide-text hover:bg-ide-activity flex items-center justify-between"
            >
              <div className="flex items-center gap-2"><Map size={12} /> Minimap</div>
              {settings.minimap && <div className="w-2 h-2 rounded-full bg-ide-accent" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuBar;