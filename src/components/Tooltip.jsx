import React from 'react';

const Tooltip = ({ content, position, isVisible }) => {
  if (!isVisible) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: position.y,
        left: position.x,
        backgroundColor: 'rgba(0,0,0,0.92)',
        borderRadius: '10px',
        padding: '12px 16px',
        color: 'white',
        fontFamily: 'Inter, sans-serif',
        fontSize: '15px',
        pointerEvents: 'none',
        maxWidth: '400px',
        wordBreak: 'break-word',
        zIndex: 100,
        transform: 'translate(-50%, -100%)',
        marginTop: '-8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)'
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default Tooltip;
