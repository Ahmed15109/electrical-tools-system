import { useState, useEffect, useCallback, memo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import SupplierTable from '../components/SupplierTable';
import SupplierForm from '../components/SupplierForm';
import { Truck, AlertTriangle, Plus } from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [displaySearch, setDisplaySearch] = useState('');

  
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(displaySearch), 300);
    return () => clearTimeout(timer);
  }, [displaySearch]);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const res = await api.get(`/suppliers${query}`);
      const data = Array.isArray(res.data?.data) ? res.data.data :
                   (Array.isArray(res.data) ? res.data : []);
      setSuppliers(data);
    } catch (err) {
      console.error('[Suppliers] Fetch failed:', err);
      setError(err.message || 'فشل جلب بيانات الموردين');
      toast.error('لم نتمكن من تحميل قائمة الموردين');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSave = useCallback(async (formData) => {
    let toastId = toast.loading('جاري حفظ البيانات...');
    try {
      setFormLoading(true);
      const payload = {
        name: formData.name?.trim(),
        phone: formData.phone?.trim()
      };

      if (selectedSupplier?.id || selectedSupplier?._id) {
        const id = selectedSupplier.id || selectedSupplier._id;
        await api.put(`/suppliers/${id}`, payload);
        toast.success('تم تحديث بيانات المورد بنجاح', { id: toastId });
      } else {
        await api.post('/suppliers', payload);
        toast.success('تم إضافة المورد بنجاح', { id: toastId });
      }

      setShowForm(false);
      setSelectedSupplier(null);
      await fetchSuppliers();
    } catch (err) {
      console.error('[Suppliers] Save failed:', err);
      const msg = err.response?.data?.error || err.message || 'حدث خطأ أثناء حفظ البيانات';
      toast.error(msg, { id: toastId });
    } finally {
      setFormLoading(false);
    }
  }, [selectedSupplier, fetchSuppliers]);

  const handleDelete = useCallback(async (id) => {
    if (!id || !window.confirm('هل أنت متأكد من حذف هذا المورد؟')) return;

    let toastId = toast.loading('جاري الحذف...');
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('تم حذف المورد بنجاح', { id: toastId });
      await fetchSuppliers();
    } catch (err) {
      console.error('[Suppliers] Delete failed:', err);
      const msg = err.response?.data?.error || err.message || 'حدث خطأ أثناء الحذف';
      toast.error(msg, { id: toastId });
    }
  }, [fetchSuppliers]);

  const handleEdit = useCallback((supplier) => {
    setSelectedSupplier(supplier);
    setShowForm(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setSelectedSupplier(null);
    setShowForm(true);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setSelectedSupplier(null);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', padding: '1rem' }}>

      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Truck size={28} color="#a855f7" />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>إدارة الموردين</h1>
        </div>

        <button
          className="btn-primary"
          onClick={handleAddNew}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
        >
          <Plus size={18} />
          <span>إضافة مورد جديد</span>
        </button>
      </div>

      {}
      {showForm && (
        <SupplierForm
          initialData={selectedSupplier}
          onSubmit={handleSave}
          onCancel={handleCancelForm}
          loading={formLoading}
        />
      )}

      {}
      <div className="glass-panel" style={{ padding: '0.8rem' }}>
        <input
          type="text"
          className="search-input"
          placeholder="بحث بالاسم أو رقم الهاتف..."
          value={displaySearch}
          onChange={e => setDisplaySearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.05)' }}>
            <p>جاري تحميل البيانات...</p>
          </div>
        )}

        {error && !suppliers.length ? (
          <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
            <AlertTriangle size={48} />
            <h2>فشل جلب البيانات</h2>
            <p>{error}</p>
            <button onClick={fetchSuppliers}>إعادة المحاولة</button>
          </div>
        ) : suppliers.length === 0 && !loading ? (
          <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
            <h3>لا يوجد موردين حالياً</h3>
            <button onClick={handleAddNew}>إضافة أول مورد</button>
          </div>
        ) : (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <SupplierTable
              suppliers={suppliers}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <div>إجمالي: {suppliers.length} مورد</div>
      </div>
    </div>
  );
};

const MemoizedSuppliers = memo(Suppliers);

export default function SuppliersWrapper() {
  return (
    <ErrorBoundary>
      <MemoizedSuppliers />
    </ErrorBoundary>
  );
}
