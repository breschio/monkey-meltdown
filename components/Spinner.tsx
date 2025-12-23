import React from 'react';

export const Spinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="w-4 h-4 bg-n64-blue rounded-full animate-bounce delay-75"></div>
      <div className="w-4 h-4 bg-n64-green rounded-full animate-bounce delay-150"></div>
      <div className="w-4 h-4 bg-n64-yellow rounded-full animate-bounce delay-300"></div>
      <div className="w-4 h-4 bg-n64-red rounded-full animate-bounce delay-500"></div>
    </div>
  );
};