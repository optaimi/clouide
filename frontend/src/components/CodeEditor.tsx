// frontend/src/components/CodeEditor.tsx
import React, { useEffect, useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Save, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

// 1. Updated Interface to accept 'settings'
interface CodeEditorProps {
  activeFile: string | null;
  theme: string;
  settings: {
    fontSize: number;
    wordWrap: boolean;
    minimap: boolean;
  };
}

// 2. Updated Component Definition to destructure 'settings'
const CodeEditor: React.FC<CodeEditorProps> = ({ activeFile, theme, settings }) => {
  const [content, setContent] = useState<string>("// Select a file to view content");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [language, setLanguage] = useState('typescript');
  
  const editorRef = useRef<any>(null);

  const getLanguageFromFilename = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': return 'javascript';
      case 'jsx': return 'javascript';
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'py': return 'python';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'sql': return 'sql';
      case 'sh': return 'shell';
      case 'yaml':
      case 'yml': return 'yaml';
      case 'dockerfile': return 'dockerfile';
      default: return 'plaintext';
    }
  };

  useEffect(() => {
    if (!activeFile) return;

    setLanguage(getLanguageFromFilename(activeFile));

    const loadFile = async () => {
      setLoading(true);
      setStatus('idle');
      try {
        const res = await axios.post('/read', { filepath: activeFile });
        setContent(res.data.content);
      } catch (err) {
        setContent("// Error loading file");
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [activeFile]);

  const handleSave = async () => {
    if (!activeFile || !editorRef.current) return;

    setSaving(true);
    setStatus('idle');
    try {
      const currentValue = editorRef.current.getValue();
      await axios.post('/write', { 
        filepath: activeFile, 
        content: currentValue 
      });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  };

  if (!activeFile) {
    return (
      <div className="flex-1 bg-ide-bg flex items-center justify-center text-ide-dim">
        Select a file to begin editing
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-ide-bg relative flex flex-col">
      <div className="h-10 bg-ide-bg border-b border-ide-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-ide-text opacity-80">{activeFile}</span>
          <span className="text-[10px] uppercase bg-ide-activity text-ide-dim px-1.5 py-0.5 rounded">
            {language}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {status === 'saved' && <span className="text-xs text-green-500 flex items-center gap-1"><Check size={12}/> Saved</span>}
          {status === 'error' && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/> Failed</span>}
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`p-1.5 rounded transition-colors ${saving ? 'bg-ide-accent/20 text-ide-accent' : 'hover:bg-ide-activity text-ide-text'}`}
            title="Save (Ctrl+S)"
          >
            <Save size={16} className={saving ? "animate-pulse" : ""} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {loading && <div className="absolute top-0 w-full h-1 bg-ide-accent animate-pulse z-10" />}
        
        {/* THIS IS THE EDITOR COMPONENT WITH THE UPDATED OPTIONS */}
        <Editor
          height="100%"
          theme={theme === 'light' ? 'light' : 'vs-dark'}
          path={activeFile}
          value={content}
          language={language}
          onMount={handleEditorDidMount}
          onChange={(value) => setContent(value || "")}
          
          // --- UPDATED OPTIONS BLOCK START ---
          options={{
            minimap: { enabled: settings.minimap },      // Uses settings prop
            fontSize: settings.fontSize,                 // Uses settings prop
            wordWrap: settings.wordWrap ? 'on' : 'off',  // Uses settings prop
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
          }}
          // --- UPDATED OPTIONS BLOCK END ---
        />
      </div>
    </div>
  );
};

export default CodeEditor;