// frontend/src/components/CodeEditor.tsx
import React, { useEffect, useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Save, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface CodeEditorProps {
  activeFile: string | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ activeFile }) => {
  const [content, setContent] = useState<string>("// Select a file to view content");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [language, setLanguage] = useState('typescript'); // Default
  
  const editorRef = useRef<any>(null);

  // Helper: Detect language from filename
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

    // 1. Detect Language immediately
    setLanguage(getLanguageFromFilename(activeFile));

    // 2. Load Content
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
      <div className="flex-1 bg-[#1e1e1e] flex items-center justify-center text-[#555]">
        Select a file to begin editing
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-[#1e1e1e] relative flex flex-col">
      <div className="h-10 bg-[#1e1e1e] border-b border-[#252526] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#cccccc] opacity-80">{activeFile}</span>
          {/* Show detected language badge */}
          <span className="text-[10px] uppercase bg-[#333] text-[#888] px-1.5 py-0.5 rounded">
            {language}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {status === 'saved' && <span className="text-xs text-green-500 flex items-center gap-1"><Check size={12}/> Saved</span>}
          {status === 'error' && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/> Failed</span>}
          
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`p-1.5 rounded transition-colors ${saving ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-[#333] text-[#cccccc]'}`}
            title="Save (Ctrl+S)"
          >
            <Save size={16} className={saving ? "animate-pulse" : ""} />
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        {loading && <div className="absolute top-0 w-full h-1 bg-blue-500 animate-pulse z-10" />}
        <Editor
          height="100%"
          theme="vs-dark"
          path={activeFile} // This helps Monaco reset undo history per file
          value={content}
          language={language} // <--- DYNAMIC LANGUAGE
          onMount={handleEditorDidMount}
          onChange={(value) => setContent(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;