// frontend/src/components/Terminal.tsx
import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { TerminalSquare, X } from 'lucide-react';

// Add 'theme' to props
interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark' | 'midnight';
}

const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose, theme }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  // Define themes
  const themes = {
    dark: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#cccccc' },
    light: { background: '#ffffff', foreground: '#333333', cursor: '#333333' },
    midnight: { background: '#0f172a', foreground: '#e2e8f0', cursor: '#38bdf8' },
  };

  useEffect(() => {
    if (!isOpen || !terminalRef.current) return;

    // 1. Initialize xterm.js if not already done
    if (!xtermRef.current) {
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: themes[theme], // Set initial theme
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());

      term.open(terminalRef.current);
      fitAddon.fit();
      
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // 2. Connect to WebSocket
      const sessionId = localStorage.getItem('clouide_session_id') || 'demo';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const wsUrl = `${protocol}//${host}${port}/terminal/ws/${sessionId}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Clear screen and fit immediately on connect
        term.write('\x1b[2J\x1b[3J\x1b[H'); 
        term.writeln('\x1b[32mWelcome to Clouide Terminal\x1b[0m');
        fitAddon.fit();
        term.focus();
      };

      ws.onmessage = (event) => term.write(event.data);
      
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      });

      // 3. Setup Resize Observer for the container
      // This ensures the terminal resizes when the user drags the pane
      resizeObserver.current = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.current.observe(terminalRef.current);
    }

    return () => {
      // Cleanup happens only on unmount effectively, 
      // but we want to keep the terminal alive if just hidden/shown usually.
      // For this simple version, we'll let it reconnect on re-open if fully unmounted.
      if (!isOpen) {
         wsRef.current?.close();
         xtermRef.current?.dispose();
         resizeObserver.current?.disconnect();
         xtermRef.current = null;
      }
    };
  }, [isOpen]);

  // Handle Theme Changes dynamically
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = themes[theme];
    }
  }, [theme]);

  // Handle Resizing when isOpen changes
  useEffect(() => {
    if (isOpen && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Use the theme background for the container to avoid white flashes
    <div className="h-full flex flex-col border-t border-ide-border" style={{ backgroundColor: themes[theme].background }}>
      <div className="flex justify-between items-center px-4 py-1 bg-ide-sidebar border-b border-ide-border select-none min-h-[30px]">
        <div className="flex items-center gap-2 text-ide-text text-xs font-bold uppercase tracking-wider">
          <TerminalSquare size={14} /> Terminal
        </div>
        <button onClick={onClose} className="text-ide-dim hover:text-ide-text">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden p-1 relative">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default Terminal;