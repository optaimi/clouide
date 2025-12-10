// frontend/src/components/Terminal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TerminalSquare, X, ChevronRight } from 'lucide-react';
import axios from 'axios';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  type: 'command' | 'output' | 'error';
  content: string;
}

const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<LogEntry[]>([
    { type: 'output', content: 'Clouide Terminal v1.0' }, // <--- Fixed Branding
    { type: 'output', content: 'Connected to workspace. Type "help" for info.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input;
    setInput('');
    setLoading(true);

    setHistory(prev => [...prev, { type: 'command', content: cmd }]);

    if (cmd === 'clear') {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post('/terminal', { command: cmd });
      
      if (res.data.output) {
        setHistory(prev => [...prev, { type: 'output', content: res.data.output }]);
      }
      if (res.data.error) {
        setHistory(prev => [...prev, { type: 'error', content: res.data.error }]);
      }
    } catch (err: any) {
      setHistory(prev => [...prev, { type: 'error', content: 'Network Error: Failed to reach backend' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Updated colors to use theme variables (bg-ide-bg, border-ide-border, etc.)
    <div className="h-full bg-ide-bg border-t border-ide-border flex flex-col font-mono text-sm">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-ide-sidebar border-b border-ide-border">
        <span className="text-ide-text text-xs flex items-center gap-2 uppercase tracking-wider font-bold">
          <TerminalSquare size={14} /> Terminal
        </span>
        <button onClick={onClose} className="text-ide-dim hover:text-ide-text">
          <X size={14} />
        </button>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {history.map((entry, i) => (
          <div key={i} className={`${entry.type === 'command' ? 'text-ide-text mt-4 font-bold' : entry.type === 'error' ? 'text-red-400' : 'text-ide-text whitespace-pre-wrap opacity-90'}`}>
            {entry.type === 'command' && <span className="text-ide-accent mr-2">$</span>}
            {entry.content}
          </div>
        ))}
        {loading && <div className="text-ide-dim animate-pulse">Running...</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleCommand} className="flex items-center px-2 py-2 bg-ide-bg border-t border-ide-border">
        <ChevronRight size={16} className="text-ide-accent mr-2" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent text-ide-text focus:outline-none placeholder-ide-dim/50"
          placeholder="Type a command (e.g. ls -la, git status)..."
          autoComplete="off"
        />
      </form>
    </div>
  );
};

export default Terminal;