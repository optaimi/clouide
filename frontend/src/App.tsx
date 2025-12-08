// frontend/src/App.tsx
import React, { useState } from 'react';
import ProjectLoader from './components/ProjectLoader';
import FileExplorer from './components/FileExplorer';
import CodeEditor from './components/CodeEditor';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  if (!isLoaded) {
    return <ProjectLoader onProjectLoaded={() => setIsLoaded(true)} />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden">
      {/* Sidebar */}
      <FileExplorer 
        onFileSelect={(filepath) => setActiveFile(filepath)} 
        selectedFile={activeFile}
      />
      
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Tab Header (Simple) */}
        <div className="h-9 bg-[#1e1e1e] border-b border-[#252526] flex items-center px-4 text-sm">
          {activeFile || "Welcome"}
        </div>
        
        {/* Editor */}
        <CodeEditor activeFile={activeFile} />
      </div>
    </div>
  );
};

export default App;