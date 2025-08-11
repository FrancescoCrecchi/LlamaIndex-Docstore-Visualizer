import React from 'react';

const NodeTypeFilterBar = ({ nodeTypeFilter, setNodeTypeFilter }) => (
  <div className="flex justify-center items-center space-x-6 mb-8">
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={nodeTypeFilter.includes('document')}
        onChange={e => {
          if (e.target.checked) {
            setNodeTypeFilter(prev => [...new Set([...prev, 'document'])]);
          } else {
            setNodeTypeFilter(prev => prev.filter(type => type !== 'document'));
          }
        }}
      />
      <span className="w-4 h-4 rounded-full bg-[#4a90e2] border border-white dark:border-gray-800 inline-block"></span>
      <span>Document</span>
    </label>
    <label className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={nodeTypeFilter.includes('text-node')}
        onChange={e => {
          if (e.target.checked) {
            setNodeTypeFilter(prev => [...new Set([...prev, 'text-node'])]);
          } else {
            setNodeTypeFilter(prev => prev.filter(type => type !== 'text-node'));
          }
        }}
      />
      <span className="w-4 h-4 rounded-full bg-[#b8b8b8] border border-white dark:border-gray-800 inline-block"></span>
      <span>Text Node</span>
    </label>
  </div>
);

export default NodeTypeFilterBar;
