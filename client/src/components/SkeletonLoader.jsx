export default function SkeletonLoader({ rows = 5 }) {
  return (
    <div style={{ padding: '1rem' }}>
      {[...Array(rows)].map((_, i) => (
        <div 
          key={i} 
          style={{ 
            height: '40px', 
            background: 'var(--border)', 
            borderRadius: '6px', 
            marginBottom: '10px',
            animation: 'pulse 1.5s infinite ease-in-out',
            opacity: 0.5
          }} 
        />
      ))}
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
