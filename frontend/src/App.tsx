import React, { useState } from 'react';
import ProjectLoader from './components/ProjectLoader';

const App: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  if (!isLoaded) {
    return <ProjectLoader onProjectLoaded={() => setIsLoaded(true)} />;
  }

  return (
    <div className="flex h-screen w-screen bg-[#1e1e1e] text-[#cccccc] items-center justify-center">
      <div className="text-2xl font-bold text-white/40">Editor Loaded</div>
    </div>
  );
};

export default App;
