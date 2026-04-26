import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, FileText } from 'lucide-react';
import { formatCurrency } from '../utils/normalize';

export default function SupplierTable({ suppliers, onEdit, onDelete }) {
  const navigate = useNavigate();

  if (!suppliers || suppliers.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        لا يوجد موردين حالياً.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', height: '100%' }}>
      <table>
        <thead>
          <tr style={{ position: 'sticky', top: 0, background: 'var(--th-bg)', zIndex: 5, boxShadow: '0 1px 0 var(--th-border)' }}>
            <th>الاسم</th>
            <th>الهاتف</th>
            <th style={{ textAlign: 'left' }}>الرصيد (عليك)</th>
            <th style={{ textAlign: 'center', width: '180px' }}>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s, idx) => {
            const id = s.id || s._id;
            const bal = s.balance || 0;
            const hasDebt = bal > 0;

            return (
              <tr key={id || idx}>
                <td style={{ fontWeight: '600' }}>{s.name}</td>
                <td style={{ direction: 'ltr', textAlign: 'right', color: 'var(--text-muted)' }}>
                  {s.phone}
                </td>
                <td style={{
                  textAlign: 'left', direction: 'ltr', fontWeight: '700',
                  color: hasDebt ? 'var(--danger)' : 'var(--success)'
                }}>
                  {formatCurrency(Math.abs(bal))}
                  {hasDebt && <span style={{ fontSize: '0.72rem', marginRight: '0.35rem', opacity: 0.7 }}>عليك</span>}
                  {!hasDebt && bal === 0 && <span style={{ fontSize: '0.72rem', marginRight: '0.35rem', opacity: 0.7 }}>خالص</span>}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                    <button
                      onClick={() => navigate(`/suppliers/${id}/statement`)}
                      title="كشف حساب"
                      style={{
                        padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                        background: 'rgba(99,102,241,0.1)', color: 'var(--accent)',
                        border: '1px solid rgba(99,102,241,0.2)', transition: 'all 0.2s'
                      }}
                    >
                      <FileText size={14} />
                    </button>
                    <button
                      onClick={() => onEdit(s)}
                      title="تعديل"
                      style={{
                        padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                        background: 'rgba(245,158,11,0.1)', color: 'var(--warning)',
                        border: '1px solid rgba(245,158,11,0.2)', transition: 'all 0.2s'
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(id)}
                      title="حذف"
                      style={{
                        padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer',
                        background: 'rgba(239,68,68,0.1)', color: 'var(--danger)',
                        border: '1px solid rgba(239,68,68,0.2)', transition: 'all 0.2s'
                      }}
                    >
                      <Trash2 size={14} />
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
}
