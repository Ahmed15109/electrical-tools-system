import { useState, useEffect } from 'react';
import { X, Truck } from 'lucide-react';

export default function SupplierForm({ initialData, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        phone: initialData.phone || '',
      });
    } else {
      setForm({ name: '', phone: '' });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const isEdit = !!(initialData?.id || initialData?._id);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)'
    }}>
      <div className="glass-panel" style={{
        width: '95%', maxWidth: '500px', padding: '2rem',
        animation: 'slideUp 0.25s ease-out',
        position: 'relative'
      }}>
        <button onClick={onCancel} style={{
          position: 'absolute', top: '1rem', left: '1rem',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', transition: 'color 0.2s'
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'rgba(168,85,247,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#a855f7'
          }}>
            <Truck size={22} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
            {isEdit ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                اسم المورد *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="اسم المورد"
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                رقم الهاتف *
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="رقم الهاتف"
                required
                style={{ width: '100%', direction: 'ltr', textAlign: 'right' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onCancel} style={{
              padding: '0.6rem 1.5rem', borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s'
            }}>
              إلغاء
            </button>
            <button type="submit" disabled={loading} className="btn-primary" style={{
              padding: '0.6rem 1.5rem', cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'جاري الحفظ...' : isEdit ? 'تحديث' : 'إضافة'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
