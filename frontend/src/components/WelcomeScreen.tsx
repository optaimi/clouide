// frontend/src/components/WelcomeScreen.tsx
import React from 'react';
import { Terminal, Settings, Save, Command } from 'lucide-react';

const WelcomeScreen: React.FC = () => {
  return (
    <div className="h-full w-full bg-ide-bg text-ide-text overflow-y-auto p-10 flex flex-col items-center">
      <div className="max-w-3xl w-full">
        <h1 className="text-4xl font-bold mb-6 text-ide-text border-b border-ide-border pb-4">
          Welcome to Clouide
        </h1>
        
        <p className="text-lg text-ide-dim mb-8">
          Your secure, cloud-native development environment is ready. 
          Use the terminal below to access pre-installed AI tools.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-ide-sidebar p-5 rounded-lg border border-ide-border">
            <h3 className="text-ide-accent font-bold mb-3 flex items-center gap-2">
              <Terminal size={18}/> AI Assistants
            </h3>
            <ul className="space-y-2 text-sm text-ide-dim">
              <li className="flex gap-2"><code className="bg-ide-activity px-1 rounded text-ide-text">gemini</code> Google Gemini CLI</li>
              <li className="flex gap-2"><code className="bg-ide-activity px-1 rounded text-ide-text">opencode</code> OpenCode Assistant</li>
              <li className="flex gap-2"><code className="bg-ide-activity px-1 rounded text-ide-text">claude</code> Claude Code CLI</li>
              <li className="flex gap-2"><code className="bg-ide-activity px-1 rounded text-ide-text">codex</code> OpenAI Codex</li>
            </ul>
          </div>

          <div className="bg-ide-sidebar p-5 rounded-lg border border-ide-border">
            <h3 className="text-ide-accent font-bold mb-3 flex items-center gap-2">
              <Command size={18}/> Shortcuts
            </h3>
            <ul className="space-y-2 text-sm text-ide-dim">
              <li className="flex items-center justify-between">
                <span>Save File</span> 
                <kbd className="bg-ide-activity px-2 py-0.5 rounded text-xs">Ctrl + S</kbd>
              </li>
              <li className="flex items-center justify-between">
                <span>Toggle Terminal</span> 
                <kbd className="bg-ide-activity px-2 py-0.5 rounded text-xs">Ctrl + `</kbd>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;