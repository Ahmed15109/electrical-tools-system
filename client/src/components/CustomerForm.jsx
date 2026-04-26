import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Save, X, Camera, Trash2, User, Phone, CreditCard, Plus, AlertCircle } from 'lucide-react';


const CustomerForm = ({ initialData, onSubmit, onCancel, loading }) => {
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    nationalId: '',
    notes: '',
  });
  const [error, setError] = useState(null);
  const [nationalIdImage, setNationalIdImage] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setError(null);
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        phone: initialData.phone || '',
        nationalId: initialData.nationalId || '',
        notes: initialData.notes || '',
      });
      setNationalIdImage(initialData.nationalIdImage || null);
    } else {
      setFormData({
        name: '',
        phone: '',
        nationalId: '',
        notes: '',
      });
      setNationalIdImage(null);
    }
  }, [initialData]);

  
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    
    if ((name === 'phone' || name === 'nationalId') && value !== '' && !/^\d+$/.test(value)) {
      return; 
    }
    
    setFormData(prev => {
      if (prev[name] === value) return prev;
      return { ...prev, [name]: value };
    });
    setError(null);
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNationalIdImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback(() => {
    setNationalIdImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    
    if (formData.phone.length > 0 && formData.phone.length !== 11) {
      setError('رقم الهاتف يجب أن يكون 11 رقماً بالضبط');
      return;
    }
    
    if (formData.nationalId && formData.nationalId.length !== 14) {
      setError('الرقم القومي يجب أن يكون 14 رقماً بالضبط');
      return;
    }

    
    onSubmit({ ...formData, nationalIdImage });
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: 'var(--accent)' }}>
          {initialData ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
        </h3>
        <button type="button" onClick={onCancel} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {error && (
          <div style={{ 
            padding: '0.8rem', 
            background: 'rgba(239,68,68,0.1)', 
            border: '1px solid var(--danger)', 
            borderRadius: '8px', 
            color: 'var(--danger)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}
        
        {}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>
              اسم العميل <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="الاسم الكامل..."
                required
                disabled={loading}
                style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem' }}
              />
              <User size={18} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            </div>
          </div>

          <div style={{ flex: '1 1 250px' }}>
            <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>
              رقم الهاتف <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(اختياري)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="01xxxxxxxxx (اختياري)"
                disabled={loading}
                maxLength={11}
                style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem' }}
              />
              <Phone size={18} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            </div>
          </div>
        </div>

        {}
        <div>
          <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>الرقم القومي</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              name="nationalId"
              value={formData.nationalId}
              onChange={handleChange}
              placeholder="14 رقم"
              maxLength="14"
              disabled={loading}
              style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 0.8rem' }}
            />
            <CreditCard size={18} style={{ position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
          </div>
        </div>

        {}
        <div>
          <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-muted)' }}>ملاحظات</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="أضف أي ملاحظات هنا..."
            rows="3"
            disabled={loading}
            style={{ width: '100%', padding: '0.8rem', resize: 'none' }}
          />
        </div>

        {}
        <div>
          <label style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-muted)' }}>
            <Camera size={16} /> رفع صورة البطاقة
          </label>
          
          <div style={{ 
            border: '2px dashed var(--border)', 
            borderRadius: '12px', 
            padding: '1.5rem', 
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            cursor: 'pointer'
          }} onClick={() => !nationalIdImage && fileInputRef.current.click()}>
            
            {nationalIdImage ? (
              <div style={{ position: 'relative', maxWidth: '300px', margin: '0 auto' }}>
                <img src={nationalIdImage} alt="ID card" style={{ width: '100%', borderRadius: '8px', maxHeight: '200px', objectFit: 'contain' }} />
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); removeImage(); }} 
                  style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', padding: '0.4rem' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div style={{ opacity: 0.4 }}>
                <Plus size={32} style={{ marginBottom: '0.5rem' }} />
                <p>اضغط لرفع الصورة</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>
        </div>

        {}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary" style={{ padding: '0.7rem 1.8rem' }}>
            إلغاء
          </button>
          <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 2.5rem' }}>
            <Save size={18} />
            {loading ? 'جاري الحفظ...' : 'حفظ البيانات'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default memo(CustomerForm);
