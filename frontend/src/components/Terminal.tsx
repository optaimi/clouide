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
  const [history, setHistory] = useState<LogEntry[]>([
    { type: 'system', content: 'Clouide Terminal v2.0 (WebSocket)' },
    { type: 'system', content: 'Initializing connection...' }
  ]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 1. Establish WebSocket Connection
  useEffect(() => {
    const sessionId = localStorage.getItem('clouide_session_id') || 'demo';
    // Note: In production, use wss:// and proper hostname
    const wsUrl = `ws://127.0.0.1:8000/terminal/ws/${sessionId}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setHistory(prev => [...prev, { type: 'system', content: 'Connected to workspace.' }]);
    };

    ws.onmessage = (event) => {
      const data = event.data;
      // Append incoming streaming data to the last output if possible, 
      // or create new entry
      setHistory(prev => {
        const last = prev[prev.length - 1];
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
      ws.close();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input;
    setInput('');

    // Local client-side commands
    if (cmd === 'clear') {
      setHistory([]);
      return;
    }

    // Display command immediately
    setHistory(prev => [...prev, { type: 'command', content: cmd }]);

    // Send to Backend via WebSocket
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
          {/* Connection Status Indicator */}
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