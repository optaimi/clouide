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
    { type: 'output', content: 'Nebula Cloud Terminal v1.0' },
    { type: 'output', content: 'Connected to workspace. Type "help" for info.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isOpen]);

  // Auto-focus input when opened
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

    // 1. Add command to history
    setHistory(prev => [...prev, { type: 'command', content: cmd }]);

    // 2. Handle special client-side commands
    if (cmd === 'clear') {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      // 3. Send to backend
      const res = await axios.post('/terminal', { command: cmd });
      
      // 4. Add Output
      if (res.data.output) {
        setHistory(prev => [...prev, { type: 'output', content: res.data.output }]);
      }
      // 5. Add Errors (if any)
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
    <div className="h-64 bg-[#1e1e1e] border-t border-[#333] flex flex-col font-mono text-sm">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#252526] border-b border-[#333]">
        <span className="text-[#cccccc] text-xs flex items-center gap-2 uppercase tracking-wider font-bold">
          <TerminalSquare size={14} /> Terminal
        </span>
        <button onClick={onClose} className="text-[#888] hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {history.map((entry, i) => (
          <div key={i} className={`${entry.type === 'command' ? 'text-white mt-4 font-bold' : entry.type === 'error' ? 'text-red-400' : 'text-[#cccccc] whitespace-pre-wrap'}`}>
            {entry.type === 'command' && <span className="text-blue-400 mr-2">$</span>}
            {entry.content}
          </div>
        ))}
        {loading && <div className="text-gray-500 animate-pulse">Running...</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleCommand} className="flex items-center px-2 py-2 bg-[#1e1e1e] border-t border-[#333]">
        <ChevronRight size={16} className="text-blue-400 mr-2" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent text-white focus:outline-none placeholder-white/20"
          placeholder="Type a command (e.g. ls -la, git status)..."
          autoComplete="off"
        />
      </form>
    </div>
  );
};

export default Terminal;