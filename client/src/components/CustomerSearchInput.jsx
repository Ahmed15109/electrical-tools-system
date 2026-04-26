import { Search, X, Loader } from 'lucide-react';

export default function CustomerSearchInput({ searchTerm, onSearchChange, isSearching }) {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '0.4rem 0.8rem',
        transition: 'border 0.2s, box-shadow 0.2s',
      }}>
        <Search size={18} style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }} />
        
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
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

        {isSearching ? (
          <Loader size={16} className="spinner" style={{ color: 'var(--accent)', marginRight: '0.5rem' }} />
        ) : (
          searchTerm && (
            <button 
              onClick={() => onSearchChange('')} 
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.2rem'
              }}
            >
              <X size={16} />
            </button>
          )
        )}
      </div>

      <style>{`
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
