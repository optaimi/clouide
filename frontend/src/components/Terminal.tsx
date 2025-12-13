// frontend/src/components/Terminal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TerminalSquare, X, ChevronRight, WifiOff, Wifi } from 'lucide-react';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  type: 'command' | 'output' | 'error' | 'system';
  content: string;
}

const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose }) => {
  // Running log of commands and outputs shown in the panel.
  const [history, setHistory] = useState<LogEntry[]>([
    { type: 'system', content: 'Clouide Terminal v1.1' }, // Updated Version Label
    { type: 'system', content: 'Initializing connection...' }
  ]);
  // Text currently inside the command input box.
  const [input, setInput] = useState('');
  // Whether the WebSocket connection to the backend is live.
  const [isConnected, setIsConnected] = useState(false);

  // Refs help us auto-scroll, focus fields, and keep the socket instance.
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Establish WebSocket Connection
  useEffect(() => {
    const sessionId = localStorage.getItem('clouide_session_id') || 'demo';
    
    // --- DYNAMIC URL FIX ---
    // This automatically grabs the IP/Domain and Port from your browser bar
    // so it works on localhost, remote VMs, or production domains.
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    const wsUrl = `${protocol}//${host}${port}/terminal/ws/${sessionId}`;
    // -----------------------
    
    console.log("Connecting to Terminal at:", wsUrl); // Debugging log

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setHistory(prev => [...prev, { type: 'system', content: 'Connected to workspace.' }]);
    };

    ws.onmessage = (event) => {
      const data = event.data;
      setHistory(prev => {
        const last = prev[prev.length - 1];
        // Append streaming text to the last output if it's an output type
        if (last && last.type === 'output') {
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + data }
          ];
        }
        return [...prev, { type: 'output', content: data }];
      });
    };

    ws.onclose = () => {
      setIsConnected(false);
      setHistory(prev => [...prev, { type: 'error', content: '\nDisconnected from server.' }]);
    };

    ws.onerror = (err) => {
      console.error("WS Error", err);
      setHistory(prev => [...prev, { type: 'error', content: '\nConnection error.' }]);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleCommand = (e: React.FormEvent) => {
    // Intercept form submission so we can send the text to the server.
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input;
    setInput('');

    if (cmd === 'clear') {
      // Special client-side command to wipe the output buffer.
      setHistory([]);
      return;
    }

    setHistory(prev => [...prev, { type: 'command', content: cmd }]);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(cmd);
    } else {
      setHistory(prev => [...prev, { type: 'error', content: 'Terminal not connected.' }]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-full bg-ide-bg border-t border-ide-border flex flex-col font-mono text-sm">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-ide-sidebar border-b border-ide-border select-none">
        <div className="flex items-center gap-3">
          <span className="text-ide-text text-xs flex items-center gap-2 uppercase tracking-wider font-bold">
            <TerminalSquare size={14} /> Terminal
          </span>
          <div className="flex items-center gap-1.5 text-[10px]">
            {isConnected ? (
              <span className="text-green-500 flex items-center gap-1"><Wifi size={10}/> Online</span>
            ) : (
              <span className="text-red-500 flex items-center gap-1"><WifiOff size={10}/> Offline</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-ide-dim hover:text-ide-text">
          <X size={14} />
        </button>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {history.map((entry, i) => (
          <div 
            key={i} 
            className={`
              whitespace-pre-wrap break-all
              ${entry.type === 'command' ? 'text-ide-text mt-4 font-bold' : ''}
              ${entry.type === 'error' ? 'text-red-400' : ''}
              ${entry.type === 'system' ? 'text-ide-accent italic opacity-70' : ''}
              ${entry.type === 'output' ? 'text-ide-dim' : ''}
            `}
          >
            {entry.type === 'command' && <span className="text-ide-accent mr-2">$</span>}
            {entry.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleCommand} className="flex items-center px-2 py-2 bg-ide-bg border-t border-ide-border">
        <ChevronRight size={16} className={`mr-2 transition-colors ${isConnected ? 'text-ide-accent' : 'text-ide-dim'}`} />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!isConnected}
          className="flex-1 bg-transparent text-ide-text focus:outline-none placeholder-ide-dim/50 disabled:cursor-not-allowed"
          placeholder={isConnected ? "Type a command..." : "Connecting..."}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
      </form>
    </div>
  );
};

export default Terminal;