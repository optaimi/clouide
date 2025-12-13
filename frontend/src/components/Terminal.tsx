// frontend/src/components/Terminal.tsx
import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { TerminalSquare, X } from 'lucide-react';
import { Theme } from '../utils/theme'; // Ensure this type exists or use string

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme; // Accepting the theme prop
}

const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose, theme }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);

  // Define the colors for your themes here
  const themes = {
    dark: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#cccccc' },
    light: { background: '#ffffff', foreground: '#333333', cursor: '#333333' },
    midnight: { background: '#0f172a', foreground: '#e2e8f0', cursor: '#38bdf8' },
  };

  useEffect(() => {
    if (!isOpen || !terminalRef.current) return;

    // 1. Initialize xterm.js (Singleton pattern for this component)
    if (!xtermRef.current) {
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: themes[theme], // Apply initial theme
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
        term.writeln('\x1b[32mWelcome to Clouide Terminal\x1b[0m');
        // Small delay to ensure container is rendered before fitting
        setTimeout(() => fitAddon.fit(), 50);
        term.focus();
      };

      ws.onmessage = (event) => term.write(event.data);
      ws.onclose = () => term.writeln('\r\n\x1b[33mDisconnected.\x1b[0m');
      
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      });

      // 3. Resize Observer (Fixes the resizing issue)
      // This watches the DIV size and reflows the terminal text automatically
      resizeObserver.current = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.current.observe(terminalRef.current);
    }

    // Cleanup logic
    return () => {
      // We don't dispose xterm on simple re-renders to keep history, 
      // but strictly speaking in React strict mode you might want to.
      // For this app, keeping it alive while mounted is fine.
    };
  }, [isOpen]);

  // 4. Dynamic Theme Updates
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = themes[theme];
    }
  }, [theme]);

  // 5. Force fit on open
  useEffect(() => {
    if (isOpen && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 100);
    }
  }, [isOpen, theme]);

  if (!isOpen) return null;

  return (
    // We set the background style here too so the padding doesn't flash white/black
    <div className="h-full flex flex-col border-t border-ide-border" style={{ backgroundColor: themes[theme].background }}>
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-1 bg-ide-sidebar border-b border-ide-border select-none min-h-[30px]">
        <div className="flex items-center gap-2 text-ide-text text-xs font-bold uppercase tracking-wider">
          <TerminalSquare size={14} /> Terminal
        </div>
        <button onClick={onClose} className="text-ide-dim hover:text-ide-text">
          <X size={14} />
        </button>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 overflow-hidden p-1 relative">
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default Terminal;