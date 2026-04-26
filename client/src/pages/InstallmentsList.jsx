import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, Search, CheckCircle, Clock, AlertTriangle, User, DollarSign, RefreshCw, ChevronDown, ChevronUp, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/normalize';
import toast from 'react-hot-toast';

// --- ROBUST DATA GUARDS ---
const safeArray = (arr) => (Array.isArray(arr) ? arr : []);
const safeNumber = (val) => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
};
const safeString = (val) => (val || '').toString();

const InstallmentRow = ({ inst, onPay, onCancel }) => {
    const [payValue, setPayValue] = useState(inst.remainingAmount / 100);
    const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
    
    const handlePayClick = () => {
        const amountCents = Math.round(Number(payValue) * 100);
        if (amountCents <= 0) return toast.error("المبلغ يجب أن يكون أكبر من الصفر");
        if (amountCents > inst.remainingAmount) return toast.error("المبلغ لا يمكن أن يتجاوز المتبقي");
        onPay(inst.id, amountCents, payDate);
    };

    return (
        <tr key={inst.id}>
            <td style={{ padding: '0.8rem' }}>{formatDate(inst.dueDate)}</td>
            <td style={{ 
                padding: '0.8rem', 
                color: 'var(--text-muted)', 
                fontSize: '0.85rem', 
                maxWidth: '180px', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap' 
            }}>
                {inst.sale?.productDisplay}
            </td>
            <td style={{ padding: '0.8rem' }}>{formatCurrency(inst.amount)}</td>
            <td style={{ padding: '0.8rem', color: 'var(--warning)', fontWeight: '700' }}>{formatCurrency(inst.remainingAmount)}</td>
            <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                <span style={{ 
                    padding: '0.3rem 0.6rem', borderRadius: '5px', fontSize: '0.75rem', 
                    background: inst.status === 'paid' ? 'rgba(16,185,129,0.1)' : (inst.status === 'overdue' ? 'rgba(239,68,68,0.1)' : (inst.status === 'partial' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)')), 
                    color: inst.status === 'paid' ? 'var(--success)' : (inst.status === 'overdue' ? 'var(--danger)' : (inst.status === 'partial' ? 'var(--accent)' : 'var(--warning)')) 
                }}>
                    {inst.status === 'paid' ? 'محصل' : (inst.status === 'overdue' ? 'متأخر' : (inst.status === 'partial' ? 'مدفوع جزئي' : 'قيد الانتظار'))}
                </span>
            </td>
            <td style={{ padding: '0.8rem' }}>
                {inst.status !== 'paid' && (
                    <input 
                        type="date" 
                        value={payDate} 
                        onChange={(e) => setPayDate(e.target.value)}
                        style={{ width: '130px', padding: '0.3rem', fontSize: '0.8rem' }}
                    />
                )}
            </td>
            <td style={{ padding: '0.8rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {inst.status !== 'paid' ? (
                        <>
                            <input 
                                type="number" 
                                value={payValue} 
                                onChange={(e) => setPayValue(e.target.value)}
                                style={{ width: '80px', padding: '0.3rem', fontSize: '0.8rem' }}
                                min="0.01"
                                max={inst.remainingAmount / 100}
                                step="0.01"
                            />
                            <button onClick={handlePayClick} className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>تحصيل</button>
                        </>
                    ) : (
                        <button onClick={() => onCancel(inst.id)} className="btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', opacity: 0.7 }}>تراجع</button>
                    )}
                </div>
            </td>
        </tr>
    );
};

export default function InstallmentsList() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedCustomers, setExpandedCustomers] = useState({});
    const [expandedSales, setExpandedSales] = useState({});

    const fetchInstallments = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            console.log("[InstallmentsList] Fetching fresh sales data...");
            const res = await api.get('/sales');
            const data = safeArray(res.data?.data || res.data);
            console.log("[InstallmentsList] Data Fetch Success:", data.length, "sales");
            setSales(data);
        } catch (err) {
            console.error("[InstallmentsList] API LOAD FAILURE:", err);
            setError(err.message || "Failed to load installments");
            toast.error("خطأ في تحميل البيانات");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInstallments();
    }, [fetchInstallments]);

    // TRANSFORMATION (Crash-Protected)
    const { stats, groupedByCustomer } = useMemo(() => {
        try {
            console.log("[InstallmentsList] Transforming data safely...");
            
            // 1. Flatten all installments with safety checks
            const flattened = safeArray(sales).flatMap(sale => {
                if (!sale) return [];
                const productNames = safeArray(sale.products).map(p => p.product?.name).filter(Boolean);
                const productDisplay = productNames.length > 0 ? productNames.join('، ') : '—';

                const context = {
                    id: sale.id || sale._id,
                    invoiceNumber: sale.invoiceNumber || 'N/A',
                    date: sale.createdAt || sale.date,
                    total: sale.totalAmount || sale.finalAmount || sale.totalPrice,
                    customer: (typeof sale.customer === 'object' && sale.customer !== null) 
                                ? sale.customer 
                                : { name: 'عميل غير معروف', _id: sale.customer },
                    productDisplay
                };
                return safeArray(sale.installments).map(inst => {
                    const rawStatus = inst?.status || (safeNumber(inst?.remainingAmount) <= 0 ? 'paid' : 'pending');
                    const isOverdue = rawStatus !== 'paid' && new Date(inst?.dueDate) < new Date();
                    const finalStatus = isOverdue ? 'overdue' : (rawStatus === 'partial' ? 'pending' : rawStatus);
                    
                    return {
                        ...inst,
                        id: inst?.id || inst?._id,
                        sale: context,
                        status: finalStatus,
                        rawStatus // Keep for debugging if needed
                    };
                });
            });

            // 2. Filter based on UI state
            const filtered = flattened.filter(inst => {
                const matchStatus = statusFilter === 'all' || inst.status === statusFilter;
                const matchSearch = safeString(inst.sale?.customer?.name).toLowerCase().includes(searchTerm.toLowerCase());
                return matchStatus && matchSearch;
            });

            // 3. Group by Customer -> Sale
            const groups = {};
            filtered.forEach(inst => {
                const customerId = safeString(inst.sale?.customer?.id || inst.sale?.customer?._id || 'unknown');
                const saleId = safeString(inst.sale?.id || inst.sale?._id || 'unknown_sale');

                if (!groups[customerId]) {
                    groups[customerId] = {
                        customer: inst.sale.customer,
                        sales: {},
                        totalRemaining: 0
                    };
                }

                if (!groups[customerId].sales[saleId]) {
                    groups[customerId].sales[saleId] = {
                        sale: inst.sale,
                        installments: []
                    };
                }

                groups[customerId].sales[saleId].installments.push(inst);
                groups[customerId].totalRemaining += safeNumber(inst.remainingAmount);
            });

            // 4. Calculate Global Stats
            const calculations = {
                pendingCount: flattened.filter(i => i.status !== 'paid').length,
                overdueCount: flattened.filter(i => i.status !== 'paid' && new Date(i.dueDate) < new Date()).length,
                totalValue: flattened.reduce((acc, i) => acc + safeNumber(i.remainingAmount), 0)
            };

            return { stats: calculations, groupedByCustomer: Object.values(groups) };
        } catch (e) {
            console.error("[InstallmentsList] FATAL TRANSFORMATION ERROR:", e);
            return { stats: { pendingCount: 0, overdueCount: 0, totalValue: 0 }, groupedByCustomer: [] };
        }
    }, [sales, searchTerm, statusFilter]);

    const handlePay = async (id, amount, paymentDate) => {
        try {
            await api.put(`/installments/${id}/pay`, { amount, paymentDate });
            toast.success("تم تحصيل القسط");
            fetchInstallments();
        } catch (err) {
            toast.error("فشل التحصيل: " + err.message);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm("هل أنت متأكد من إلغاء عملية التحصيل لهذه القسط؟ سيتم عكس العملية المالية.")) return;
        try {
            await api.put(`/installments/${id}/cancel`, { reason: 'إلغاء من صفحة الأقساط' });
            toast.success("تم إلغاء التحصيل بنجاح");
            fetchInstallments();
        } catch (err) {
            toast.error("فشل الإلغاء: " + err.message);
        }
    };

    const toggleCustomer = (id) => {
        setExpandedCustomers(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleSale = (id) => {
        setExpandedSales(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleExport = () => {
        try {
            const exportData = [];
            safeArray(groupedByCustomer).forEach(group => {
                Object.values(group.sales).forEach(saleGroup => {
                    safeArray(saleGroup.installments).forEach(inst => {
                        exportData.push({
                            'اسم العميل': group.customer?.name || '—',
                            'رقم الفاتورة': saleGroup.sale.invoiceNumber || '—',
                            'المنتج': saleGroup.sale.productDisplay || '—',
                            'مبلغ القسط': inst.amount / 100,
                            'المبلغ المدفوع': (inst.paidAmount || 0) / 100,
                            'المبلغ المتبقي': (inst.remainingAmount || 0) / 100,
                            'تاريخ الاستحقاق': formatDate(inst.dueDate),
                            'الحالة': inst.status === 'paid' ? 'محصل' : (inst.status === 'overdue' ? 'متأخر' : (inst.status === 'partial' ? 'مدفوع جزئي' : 'قيد الانتظار')),
                            'تاريخ التحصيل': inst.paidAt ? formatDate(inst.paidAt) : '—'
                        });
                    });
                });
            });

            if (exportData.length === 0) return toast.error("لا توجد بيانات للتصدير");

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "الأقساط");
            XLSX.writeFile(wb, `installments_export_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("تم تصدير الملف بنجاح");
        } catch (err) {
            console.error("Export Error:", err);
            toast.error("فشل تصدير الملف");
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>
            <RefreshCw className="animate-spin" size={32} />
            <p style={{ marginTop: '1rem' }}>جاري تحميل البيانات...</p>
        </div>
    );

    if (error) return (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--danger)', margin: '2rem auto', maxWidth: '500px' }}>
            <AlertTriangle size={48} style={{ marginBottom: '1rem' }} />
            <h3>خطأ في النظام</h3>
            <p>{error}</p>
            <button onClick={fetchInstallments} className="btn-primary">إعادة المحاولة</button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Calendar size={32} color="var(--accent)" /> التحصيل المالي
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>متابعة مديونيات العملاء والأقساط المجدولة</p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderRight: '4px solid var(--accent)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>أقساط منتظرة</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{stats.pendingCount}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderRight: '4px solid var(--danger)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>متأخر</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--danger)' }}>{stats.overdueCount}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderRight: '4px solid var(--success)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>إجمالي المتبقي</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--success)' }}>{formatCurrency(stats.totalValue)}</div>
                    </div>
                </div>
            </header>

            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                    <Search size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                    <input 
                        type="text" 
                        placeholder="بحث باسم العميل..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.7rem 2.8rem 0.7rem 1rem' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: '10px' }}>
                    {['all', 'pending', 'overdue', 'paid'].map(f => (
                        <button 
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            style={{ 
                                padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
                                background: statusFilter === f ? 'var(--accent)' : 'transparent',
                                color: statusFilter === f ? 'white' : 'var(--text-muted)'
                            }}
                        >
                            {f === 'all' ? 'الكل' : f === 'pending' ? 'منتظر' : f === 'overdue' ? 'متأخر' : 'تم'}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={handleExport}
                    className="btn-secondary"
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.6rem 1.2rem',
                        marginRight: 'auto' // Pull to the left in RTL, or right in LTR. In RTL it will be on the left.
                    }}
                    disabled={safeArray(groupedByCustomer).length === 0}
                >
                    <Download size={18} /> تصدير Excel
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {safeArray(groupedByCustomer).length > 0 ? (
                    groupedByCustomer.map(group => {
                        const cid = safeString(group.customer?.id || group.customer?._id || Math.random());
                        const isExpanded = !!expandedCustomers[cid];
                        return (
                            <div key={cid} className="glass-panel" style={{ overflow: 'hidden', border: isExpanded ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
                                <div 
                                    onClick={() => toggleCustomer(cid)}
                                    style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(var(--accent-rgb), 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={22} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{group.customer?.name || 'عميل غير معروف'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{Object.keys(group.sales).length} فاتورة نشطة</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>إجمالي المتبقي</div>
                                            <div style={{ fontWeight: '800', color: 'var(--warning)', fontSize: '1.2rem' }}>{formatCurrency(group.totalRemaining)}</div>
                                        </div>
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div style={{ background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--border)', padding: '0.5rem 0' }}>
                                        {Object.values(group.sales).map(saleGroup => {
                                            const sid = safeString(saleGroup.sale.id || saleGroup.sale._id);
                                            const isSaleExpanded = !!expandedSales[sid];
                                            
                                            return (
                                                <div key={sid} style={{ margin: '0.5rem 1rem', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                                                    <div 
                                                        onClick={(e) => { e.stopPropagation(); toggleSale(sid); }}
                                                        style={{ 
                                                            padding: '1rem', 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center', 
                                                            cursor: 'pointer',
                                                            background: isSaleExpanded ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                            <div style={{ fontWeight: '700', color: 'var(--accent)', fontSize: '0.95rem' }}>فاتورة #{saleGroup.sale.invoiceNumber}</div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                <Calendar size={14} /> {formatDate(saleGroup.sale.date)}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                                <DollarSign size={14} /> {formatCurrency(saleGroup.sale.total)}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <div style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                                                {saleGroup.installments.length} أقساط
                                                            </div>
                                                            {isSaleExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </div>
                                                    </div>

                                                    {isSaleExpanded && (
                                                        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                                                            <div style={{ overflowX: 'auto' }}>
                                                                <table style={{ width: '100%', textAlign: 'right' }}>
                                                                    <thead>
                                                                        <tr>
                                                                            <th style={{ padding: '0.5rem' }}>التاريخ</th>
                                                                            <th style={{ padding: '0.5rem' }}>المنتج</th>
                                                                            <th style={{ padding: '0.5rem' }}>المبلغ</th>
                                                                            <th style={{ padding: '0.5rem' }}>المتبقي</th>
                                                                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>الحالة</th>
                                                                            <th style={{ padding: '0.5rem' }}>تاريخ التحصيل</th>
                                                                            <th style={{ padding: '0.5rem' }}>إجراء</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {safeArray(saleGroup.installments).map(inst => (
                                                                            <InstallmentRow 
                                                                                key={inst.id} 
                                                                                inst={inst} 
                                                                                onPay={handlePay} 
                                                                                onCancel={handleCancel} 
                                                                            />
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.3 }}>
                        <Clock size={48} style={{ margin: '0 auto 1rem' }} />
                        <p>لا توجد أقساط مطابقة</p>
                    </div>
                )}
            </div>

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                th { color: var(--text-muted); font-size: 0.8rem; border-bottom: 1px solid var(--border); }
                td { border-bottom: 1px solid rgba(255,255,255,0.03); }
            `}</style>
        </div>
    );
}
