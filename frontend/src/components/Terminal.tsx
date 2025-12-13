// frontend/src/components/Terminal.tsx
import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css'; // Import xterm styles
import { TerminalSquare, X } from 'lucide-react';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!isOpen || !terminalRef.current) return;

    // 1. Initialize xterm.js
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
      },
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

    // 3. Handle Data Flow
    ws.onopen = () => {
      term.writeln('\x1b[32mWelcome to Clouide Terminal\x1b[0m');
      // Trigger a resize to ensure backend PTY knows the size (optional implementation)
      term.focus();
    };

    ws.onmessage = (event) => {
      // Write raw data from backend PTY directly to xterm
      term.write(event.data);
    };

    ws.onerror = () => {
      term.writeln('\r\n\x1b[31mConnection error.\x1b[0m');
    };

    ws.onclose = () => {
      term.writeln('\r\n\x1b[33mDisconnected.\x1b[0m');
    };

    // 4. Send Keystrokes to Backend
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // 5. Cleanup
    return () => {
      ws.close();
      term.dispose();
    };
  }, [isOpen]);

  // Handle resizing
  useEffect(() => {
    if (isOpen && fitAddonRef.current) {
      // Small timeout to allow layout to settle
      setTimeout(() => fitAddonRef.current?.fit(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border-t border-ide-border">
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