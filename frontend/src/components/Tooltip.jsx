import React, { useState } from 'react';

function Tooltip({ children, content, delay = 200 }) {
  const [visible, setVisible] = useState(false);
  let timeoutId;

  const show = () => {
    timeoutId = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timeoutId);
    setVisible(false);
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg max-w-xs z-50 whitespace-nowrap">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

export default Tooltip;