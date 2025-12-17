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
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const pingIntervalRef = useRef<any>(null);

  const themes = {
    dark: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#cccccc' },
    light: { background: '#ffffff', foreground: '#333333', cursor: '#333333' },
    midnight: { background: '#0f172a', foreground: '#e2e8f0', cursor: '#38bdf8' },
  };

  const fitTerminal = () => {
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
    // Listener for "Run Code" button from App.tsx
    const handleRunCommand = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && customEvent.detail) {
        // Send command followed by newline to execute
        wsRef.current.send(customEvent.detail + '\r');
        if (xtermRef.current) xtermRef.current.focus();
      }
    };

    window.addEventListener('clouide:run-command', handleRunCommand);
    return () => {
      window.removeEventListener('clouide:run-command', handleRunCommand);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !terminalRef.current) return;

    if (!xtermRef.current) {
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
      
      // 1. Enable Clickable Links
      term.loadAddon(new WebLinksAddon()); 

      term.open(terminalRef.current);
      try { fitAddon.fit(); } catch (e) {}

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      const sessionId = localStorage.getItem('clouide_session_id') || 'demo';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const wsUrl = `${protocol}//${host}${port}/terminal/ws/${sessionId}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // 2. Display Welcome Banner with AI Tools
        term.write('\x1b[2J\x1b[0;0H');
        
        term.writeln('\x1b[1;32mWelcome to Clouide Terminal\x1b[0m');
        term.writeln('------------------------------------------------');
        term.writeln('\x1b[1;34mAI Tools Available:\x1b[0m');
        term.writeln('  \x1b[36m◆ gemini\x1b[0m   - Google Gemini CLI');
        term.writeln('  \x1b[36m◆ opencode\x1b[0m - Open Source AI Assistant');
        term.writeln('  \x1b[36m◆ claude\x1b[0m   - Anthropic Claude Code');
        term.writeln('  \x1b[36m◆ codex\x1b[0m    - OpenAI Codex CLI');
        term.writeln('');
        term.writeln('Type \x1b[33m<tool> --help\x1b[0m to get started.');
        term.writeln('------------------------------------------------');
        term.writeln('');

        setTimeout(() => fitTerminal(), 100);
        term.focus();

        // Keep-Alive Ping
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('__ping__');
          }
        }, 30000);
      };

      ws.onmessage = (event) => term.write(event.data);
      ws.onclose = () => {
        term.writeln('\r\n\x1b[33mDisconnected.\x1b[0m');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      };
      
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      });

      resizeObserver.current = new ResizeObserver(() => {
        requestAnimationFrame(() => fitTerminal());
      });
      resizeObserver.current.observe(terminalRef.current);
      window.addEventListener('resize', fitTerminal);
    }

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, []);

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