import React from 'react';

const Tooltip = ({ content, position, isVisible }) => {
  if (!isVisible) return null;
  const style = {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '14px',
    pointerEvents: 'none',
    maxWidth: '300px',
    wordWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    zIndex: 100,
    transform: 'translate(-50%, -100%)',
    marginTop: '-10px'
  };
  return (
    <div style={style} dangerouslySetInnerHTML={{ __html: content }} />
  );
};

export default Tooltip;
