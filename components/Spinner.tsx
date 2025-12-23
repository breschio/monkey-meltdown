import React from 'react';

export const Spinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="w-4 h-4 bg-mm-pink rounded-full animate-bounce delay-75"></div>
      <div className="w-4 h-4 bg-mm-purple rounded-full animate-bounce delay-150"></div>
      <div className="w-4 h-4 bg-mm-magenta rounded-full animate-bounce delay-300"></div>
      <div className="w-4 h-4 bg-mm-mint rounded-full animate-bounce delay-500"></div>
    </div>
  );
};