import { memo } from 'react';
import { Edit, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/normalize';


const CustomerTable = ({ customers, onEdit, onDelete, offline }) => {
  const navigate = useNavigate();
  
  if (!customers || customers.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>لا يوجد عملاء</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>الاسم</th>
            <th>رقم الهاتف</th>
            <th>الرقم القومي</th>
            <th>ملاحظات</th>
            <th>الرصيد</th>
            <th style={{ textAlign: 'center' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const customerId = customer.id || customer._id;
            return (
              <tr
                key={customerId}
                onClick={() => customerId && navigate(`/customers/${customerId}`)}
                style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ fontWeight: '600', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {String(customer.name || '—')}
                    {customer.nationalIdImage && (
                        <span title="مرفق صورة هوية" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
                            <FileText size={14} />
                        </span>
                    )}
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{String(customer.phone || '')}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{String(customer.nationalId || '—')}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {String(customer.notes || '—')}
                </td>
                <td style={{ fontWeight: '600', direction: 'ltr', textAlign: 'right', color: customer.balance > 0 ? 'var(--warning)' : 'var(--text-main)' }}>
                  {formatCurrency(customer.balance || 0)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); if (customerId) navigate(`/customers/${customerId}`); }}
                      style={{ 
                        color: 'var(--success)', 
                        padding: '0.4rem', 
                        borderRadius: '4px', 
                        background: 'rgba(16, 185, 129, 0.1)',
                        cursor: 'pointer'
                      }}
                      title="ملف العميل"
                    >
                      <FileText size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(customer); }}
                      disabled={offline}
                      style={{ 
                        color: 'var(--accent)', 
                        padding: '0.4rem', 
                        borderRadius: '4px', 
                        background: 'rgba(59, 130, 246, 0.1)',
                        opacity: offline ? 0.5 : 1,
                        cursor: offline ? 'not-allowed' : 'pointer'
                      }}
                      title="تعديل العميل"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا العميل؟')) {
                          onDelete(customerId);
                        }
                      }}
                      disabled={offline}
                      style={{ 
                        color: 'var(--danger)', 
                        padding: '0.4rem', 
                        borderRadius: '4px', 
                        background: 'rgba(239, 68, 68, 0.1)',
                        opacity: offline ? 0.5 : 1,
                        cursor: offline ? 'not-allowed' : 'pointer'
                      }}
                      title="حذف العميل"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default memo(CustomerTable);
