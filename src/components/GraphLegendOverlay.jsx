import React from 'react';

const GraphLegendOverlay = () => (
  <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col space-y-2 text-sm z-10 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center space-x-2">
      <span className="w-4 h-4 rounded-full bg-[#50e3c2] border border-white dark:border-gray-800"></span>
      <span>New</span>
    </div>
    <div className="flex items-center space-x-2">
      <span className="w-4 h-4 rounded-full bg-[#f5a623] border border-white dark:border-gray-800"></span>
      <span>Updated</span>
    </div>
    <div className="flex items-center space-x-2">
      <span className="w-4 h-4 rounded-full bg-[#ff4a4a] border border-white dark:border-gray-800"></span>
      <span>Deleted</span>
    </div>
  </div>
);

export default GraphLegendOverlay;
