import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(' ErrorBoundary Caught:', error);
    console.error(' Component Stack:', errorInfo);

    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.01)',
            borderRadius: '16px'
          }}
        >
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              padding: '2rem',
              borderRadius: '50%',
              marginBottom: '1.5rem'
            }}
          >
            <AlertTriangle size={48} />
          </div>

          <h1 style={{ marginBottom: '1rem' }}>
            🚨 حصل خطأ في الصفحة
          </h1>

          {}
          <p style={{ color: 'red', marginBottom: '1rem', fontWeight: 'bold' }}>
            {this.state.error?.message}
          </p>

          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', marginBottom: '2rem' }}>
            حدث خطأ أثناء تحميل البيانات. يمكنك إعادة تحميل الصفحة أو مراجعة الخطأ أدناه.
          </p>

          <button
            onClick={this.handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.8rem 2rem',
              background: 'var(--accent)',
              color: 'white',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            <RefreshCw size={20} />
            إعادة التحميل
          </button>

          {}
          <div style={{ marginTop: '2rem', width: '100%' }}>
            <pre
              style={{
                padding: '1rem',
                background: '#111',
                color: '#ff6b6b',
                borderRadius: '8px',
                fontSize: '0.8rem',
                textAlign: 'left',
                overflowX: 'auto'
              }}
            >
              {this.state.error?.stack}
            </pre>

            <pre
              style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#000',
                color: '#00ffae',
                borderRadius: '8px',
                fontSize: '0.75rem',
                textAlign: 'left',
                overflowX: 'auto'
              }}
            >
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;