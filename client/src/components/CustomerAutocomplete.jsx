import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader, User, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAutocomplete } from '../hooks/useCustomerAutocomplete';

export default function CustomerAutocomplete({ searchTerm, onSearchChange, isSearching }) {
  const navigate = useNavigate();
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);

  
  const { suggestions, isLoading: autocompleteLoading } = useCustomerAutocomplete(searchTerm, 250);

  const showSuggestions = isFocused && searchTerm.trim().length >= 2 && (suggestions.length > 0 || autocompleteLoading);

  useEffect(() => {
    
    setActiveIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  const handleSelect = (customer) => {
    onSearchChange(customer.name);
    setIsFocused(false);
    navigate(`/customers/${customer.id}`);
  };

  
  const getHighlightedText = (text, highlight) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return <span> { parts.map((part, i) => 
        <span key={i} style={part.toLowerCase() === highlight.toLowerCase() ? { color: 'var(--accent)', fontWeight: 'bold' } : {} }>
            {part}
        </span>)
    } </span>;
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', maxWidth: '400px', zIndex: 50 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${isFocused ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '8px',
        padding: '0.4rem 0.8rem',
        transition: 'all 0.2s ease',
        boxShadow: isFocused ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : 'none'
      }}>
        <Search size={18} style={{ color: isFocused ? 'var(--accent)' : 'var(--text-muted)', marginLeft: '0.5rem', transition: 'color 0.2s' }} />
        
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="ابحث بالاسم أو الرقم القومي..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-main)',
            fontSize: '0.95rem'
          }}
        />

        {(isSearching || autocompleteLoading) ? (
          <Loader size={16} className="spinner" style={{ color: 'var(--accent)', marginRight: '0.5rem' }} />
        ) : (
          searchTerm && (
            <button 
              onClick={() => { onSearchChange(''); document.querySelector('input').focus(); }} 
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem'
              }}
            >
              <X size={16} />
            </button>
          )
        )}
      </div>

      {showSuggestions && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: '8px', overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          animation: 'fadeSlideDown 0.2s ease'
        }}>
          {suggestions.length === 0 && !autocompleteLoading ? (
             <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
               لا يوجد نتائج مطابقة
             </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '300px', overflowY: 'auto' }}>
              {suggestions.map((cust, index) => {
                const isActive = index === activeIndex;
                return (
                  <li 
                    key={cust.id}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelect(cust)}
                    style={{
                      padding: '0.8rem 1rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.2rem',
                      background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                      transition: 'background 0.1s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={14} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                            {getHighlightedText(cust.name, searchTerm)}
                        </span>
                    </div>
                    {cust.nationalId && (
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', paddingRight: '1.2rem' }}>
                            <CreditCard size={12} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {getHighlightedText(cust.nationalId, searchTerm)}
                            </span>
                       </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeSlideDown {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
