import { useState, useEffect, useCallback, memo, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

import CustomerTable from '../components/CustomerTable';
import CustomerForm from '../components/CustomerForm';

import { Users, AlertTriangle, Plus } from 'lucide-react';

import { useCustomerSearch } from '../hooks/useCustomerSearch';
import ErrorBoundary from '../components/ErrorBoundary';


const Customers = () => {
  const [baseCustomers, setBaseCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const {
    searchTerm,
    setSearchTerm,
    results: customers,
    isSearching
  } = useCustomerSearch(baseCustomers);

  
  const [displaySearchTerm, setDisplaySearchTerm] = useState(searchTerm);

  const abortControllerRef = useRef(null);

  const safeCustomers = Array.isArray(customers) ? customers : [];

  
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(displaySearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [displaySearchTerm, setSearchTerm]);

  
  const handleSearchChange = useCallback((e) => {
    setDisplaySearchTerm(e.target.value);
  }, []);

  const fetchCustomers = useCallback(async (isLoadMore = false) => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    try {
      if (!isLoadMore) setLoading(true);
      setError(null);

      const targetPage = isLoadMore ? page + 1 : 1;
      const res = await api.get(`/customers?page=${targetPage}&limit=50`);

      if (signal.aborted) return;

      const newItems = Array.isArray(res.data?.data) ? res.data.data : 
                       (Array.isArray(res.data) ? res.data : []);

      if (isLoadMore) {
        setBaseCustomers(prev => [...prev, ...newItems]);
        setPage(targetPage);
      } else {
        setBaseCustomers(newItems);
        setPage(1);
      }

      setHasMore(newItems.length >= 50);
    } catch (err) {
      if (signal.aborted) return;
      console.error('[Customers] Fetch failed:', err);
      setError(err.message || 'فشل جلب بيانات العملاء');
      toast.error('لم نتمكن من تحميل قائمة العملاء');
    } finally {
      if (!signal.aborted) {
          setLoading(false);
      }
    }
  }, [page]);

  useEffect(() => {
    fetchCustomers(false);
    return () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleSave = useCallback(async (formData) => {
    let toastId = toast.loading('جاري حفظ البيانات...');
    try {
      setFormLoading(true);

      const payload = {
        name: formData.name?.trim(),
        phone: formData.phone?.trim(),
        nationalId: formData.nationalId?.trim() || null,
        notes: formData.notes || '',
        nationalIdImage: formData.nationalIdImage || null
      };

      if (selectedCustomer?.id || selectedCustomer?._id) {
        const id = selectedCustomer.id || selectedCustomer._id;
        await api.put(`/customers/${id}`, payload);
        toast.success('تم تحديث بيانات العميل بنجاح', { id: toastId });
      } else {
        await api.post('/customers', payload);
        toast.success('تم إضافة العميل بنجاح', { id: toastId });
      }

      setShowForm(false);
      setSelectedCustomer(null);
      await fetchCustomers();
    } catch (err) {
      console.error('[Customers] Save failed:', err);
      const msg = err.response?.data?.error || err.message || 'حدث خطأ أثناء حفظ البيانات';
      toast.error(msg, { id: toastId });
    } finally {
      setFormLoading(false);
    }
  }, [selectedCustomer, fetchCustomers]);

  const handleDelete = useCallback(async (id) => {
    if (!id || !window.confirm('هل أنت متأكد من حذف هذا العميل؟')) return;

    let toastId = toast.loading('جاري الحذف...');
    try {
      await api.delete(`/customers/${id}`);
      toast.success('تم حذف العميل بنجاح', { id: toastId });
      await fetchCustomers();
    } catch (err) {
      console.error('[Customers] Delete failed:', err);
      const msg = err.response?.data?.error || err.message || 'حدث خطأ أثناء الحذف';
      toast.error(msg, { id: toastId });
    }
  }, [fetchCustomers]);

  const handleEdit = useCallback((customer) => {
    setSelectedCustomer(customer);
    setShowForm(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setSelectedCustomer(null);
    setShowForm(true);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setSelectedCustomer(null);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem', padding: '1rem' }}>

      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Users size={28} color="var(--accent)" />
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>إدارة العملاء</h1>
          {isSearching && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>جاري البحث...</span>}
        </div>

        <button
          className="btn-primary"
          onClick={handleAddNew}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
        >
          <Plus size={18} />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {}
      {showForm && (
        <CustomerForm
          initialData={selectedCustomer}
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
          placeholder="بحث بالاسم أو الهاتف أو الرقم القومي..."
          value={displaySearchTerm}
          onChange={handleSearchChange}
          style={{ width: '100%' }}
        />
      </div>

      {}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>

        {loading && page === 1 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.05)' }}>
            <p>جاري تحميل البيانات...</p>
          </div>
        )}

        {error && !baseCustomers.length ? (
          <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
            <AlertTriangle size={48} />
            <h2>فشل جلب البيانات</h2>
            <p>{error}</p>
            <button onClick={() => fetchCustomers(false)}>إعادة المحاولة</button>
          </div>

        ) : safeCustomers.length === 0 && !loading ? (
          <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
            <h3>لا يوجد عملاء حالياً</h3>
            <button onClick={handleAddNew}>إضافة أول عميل</button>
          </div>

        ) : (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <CustomerTable
              customers={safeCustomers}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <div>إجمالي: {safeCustomers.length} عميل</div>
      </div>

    </div>
  );
};

const MemoizedCustomers = memo(Customers);

export default function CustomersWrapper() {
  return (
    <ErrorBoundary>
      <MemoizedCustomers />
    </ErrorBoundary>
  );
}