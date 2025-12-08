// frontend/src/components/CodeEditor.tsx
import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

interface CodeEditorProps {
  activeFile: string | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ activeFile }) => {
  const [content, setContent] = useState<string>("// Select a file to view content");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeFile) return;

    const loadFile = async () => {
      setLoading(true);
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

  if (!activeFile) {
    return (
      <div className="flex-1 bg-[#1e1e1e] flex items-center justify-center text-[#555]">
        Select a file to begin editing
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-[#1e1e1e] relative">
      {loading && <div className="absolute top-0 w-full h-1 bg-blue-500 animate-pulse z-10" />}
      <Editor
        height="100%"
        theme="vs-dark"
        path={activeFile}
        value={content}
        defaultLanguage="typescript" // Auto-detect based on file extension ideally
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;