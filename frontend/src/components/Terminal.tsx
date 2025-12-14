// frontend/src/components/Terminal.tsx
import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { TerminalSquare, X } from 'lucide-react';
import { Theme } from '../utils/theme';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
}

const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose, theme }) => {
  // ... (refs remain the same) ...
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);
  // NEW: Ref to store the ping interval ID
  const pingIntervalRef = useRef<any>(null);

  // ... (themes object remains the same) ...
  const themes = {
    dark: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#cccccc' },
    light: { background: '#ffffff', foreground: '#333333', cursor: '#333333' },
    midnight: { background: '#0f172a', foreground: '#e2e8f0', cursor: '#38bdf8' },
  };

  const fitTerminal = () => {
     // ... (keep existing fitTerminal logic) ...
     if (!fitAddonRef.current || !xtermRef.current || !wsRef.current) return;
     try {
       fitAddonRef.current.fit();
       const cols = xtermRef.current.cols;
       const rows = xtermRef.current.rows;
       if (wsRef.current.readyState === WebSocket.OPEN) {
         wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
       }
     } catch (e) { console.error("Fit error", e); }
  };

  useEffect(() => {
    if (!isOpen || !terminalRef.current) return;

    if (!xtermRef.current) {
      // ... (keep xterm initialization logic) ...
      const term = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: themes[theme],
        allowProposedApi: true,
        cols: 120, 
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon()); // Allows clicking links!

      term.open(terminalRef.current);
      try { fitAddon.fit(); } catch (e) {}

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // ... (WebSocket connection logic) ...
      const sessionId = localStorage.getItem('clouide_session_id') || 'demo';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const wsUrl = `${protocol}//${host}${port}/terminal/ws/${sessionId}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        term.writeln('\x1b[32mWelcome to Clouide Terminal\x1b[0m');
        setTimeout(() => fitTerminal(), 100);
        term.focus();

        // --- NEW: START KEEP-ALIVE PING ---
        // Send a ping every 30 seconds to keep ngrok/proxies alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('__ping__'); // Backend will ignore this
          }
        }, 30000);
      };

      ws.onmessage = (event) => term.write(event.data);
      ws.onclose = () => {
        term.writeln('\r\n\x1b[33mDisconnected.\x1b[0m');
        // Clear interval on close
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      };
      
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      });

      // ... (rest of resize logic remains the same) ...
      resizeObserver.current = new ResizeObserver(() => {
        requestAnimationFrame(() => fitTerminal());
      });
      resizeObserver.current.observe(terminalRef.current);
      window.addEventListener('resize', fitTerminal);
    }

    return () => {
      // Cleanup interval on unmount
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, []);

  // ... (rest of component: useEffects for theme, animation, and return statement) ...
  // Keep the rest of the file exactly as it was in the previous valid version
  // Just ensure you add the pingInterval logic inside ws.onopen
  
  // (Adding missing parts for completeness of the copy-paste)
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = themes[theme];
    }
  }, [theme]);

  useEffect(() => {
    if (isOpen) {
       const timers = [50, 150, 300, 500].map(t => setTimeout(() => fitTerminal(), t));
       return () => timers.forEach(t => clearTimeout(t));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col border-t border-ide-border" style={{ backgroundColor: themes[theme].background }}>
      <div className="flex justify-between items-center px-4 py-1 bg-ide-sidebar border-b border-ide-border select-none min-h-[30px]">
        <div className="flex items-center gap-2 text-ide-text text-xs font-bold uppercase tracking-wider">
          <TerminalSquare size={14} /> Terminal
        </div>
        <button onClick={onClose} className="text-ide-dim hover:text-ide-text">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 p-1 relative w-full h-full overflow-hidden">
        <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default Terminal;