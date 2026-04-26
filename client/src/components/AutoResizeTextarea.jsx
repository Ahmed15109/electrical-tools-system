import { useEffect, useRef } from 'react';

const AutoResizeTextarea = ({ value, onChange, placeholder }) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {

      textareaRef.current.style.height = '42px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea 
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{ 
          width: '100%', 
          padding: '0.75rem', 
          borderRadius: '8px', 
          resize: 'none', 
          minHeight: '42px',
          maxHeight: '140px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          color: 'var(--text-main)',
          outline: 'none',
          fontFamily: 'inherit',
          overflowY: 'auto',
          boxSizing: 'border-box'
      }}
    />
  );
};

export default AutoResizeTextarea;
