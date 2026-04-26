import React, { memo, useCallback } from 'react';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { Edit, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/normalize';

const GRID_COLUMNS = 'minmax(160px, 1.5fr) 120px 140px minmax(120px, 1.5fr) 120px 140px';


const Row = memo(({ index, style, data }) => {
  const { customers, onEdit, onDelete, offline, navigate, isItemLoaded } = data;

  if (!isItemLoaded(index)) {
    return (
      <div style={{ ...style, display: 'grid', gridTemplateColumns: GRID_COLUMNS, alignItems: 'center', padding: '0 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1 / -1', textAlign: 'center' }}>
          جاري التحميل...
        </div>
      </div>
    );
  }

  const customer = customers?.[index];
  if (!customer) return null;

  return (
    <div
      style={{ ...style, display: 'grid', gridTemplateColumns: GRID_COLUMNS, alignItems: 'center', padding: '0 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
      onClick={() => customer?.id && navigate(`/customers/${customer.id}`)}
    >
      <div style={{ fontWeight: '600', color: 'var(--accent)', display: 'flex', gap: '0.4rem' }}>
        {String(customer?.name || '—')}
        {customer?.nationalIdImage && <FileText size={14} />}
      </div>

      <div style={{ color: 'var(--text-muted)' }}>{String(customer?.phone || '')}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{String(customer?.nationalId || '—')}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {String(customer?.notes || '—')}
      </div>

      <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
        {formatCurrency(customer?.balance || 0)}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
        <button onClick={(e) => { e.stopPropagation(); customer?.id && navigate(`/customers/${customer.id}`); }}>
          <FileText size={16} />
        </button>

        <button onClick={(e) => { e.stopPropagation(); onEdit?.(customer); }} disabled={offline}>
          <Edit size={16} />
        </button>

        <button onClick={(e) => { e.stopPropagation(); customer?.id && onDelete?.(customer.id); }} disabled={offline}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  const prev = prevProps.data.customers?.[prevProps.index];
  const next = nextProps.data.customers?.[nextProps.index];
  return prev === next && prevProps.data.offline === nextProps.data.offline;
});


export default function CustomerTableVirtual({
  customers = [],
  onEdit,
  onDelete,
  offline,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
}) {
  const navigate = useNavigate();

  
  if (!AutoSizer || !List) {
    console.error('CRITICAL: Library Import Failure (AutoSizer or List is undefined)');
    return <div style={{ color: 'red', padding: '1rem' }}>خطأ في تحميل المكتبات البرمجية</div>;
  }

  const safeCustomers = Array.isArray(customers) ? customers : [];

  if (!safeCustomers.length && !isNextPageLoading) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        لا يوجد عملاء
      </div>
    );
  }

  const itemCount = hasNextPage
    ? safeCustomers.length + 1
    : safeCustomers.length;

  const isItemLoaded = (index) =>
    !hasNextPage || index < safeCustomers.length;

  const itemData = {
    customers: safeCustomers,
    onEdit,
    onDelete,
    offline,
    navigate,
    isItemLoaded,
  };

  const handleItemsRendered = ({ visibleStopIndex }) => {
    if (
      hasNextPage &&
      !isNextPageLoading &&
      visibleStopIndex >= safeCustomers.length - 2
    ) {
      loadNextPage?.();
    }
  };

  return (
    <div className="glass-panel" style={{ height: '600px', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--panel-bg)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, padding: '1rem', background: 'rgba(255,255,255,0.03)', borderBottom: '2px solid var(--border)', fontWeight: 'bold' }}>
        <div>الاسم</div>
        <div>الهاتف</div>
        <div>الرقم القومي</div>
        <div>ملاحظات</div>
        <div>الرصيد</div>
        <div style={{ textAlign: 'center' }}>الإجراءات</div>
      </div>

      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        <AutoSizer>
          {(props) => {
            console.log(`[AutoSizer] Dimensions: ${props.width}x${props.height} | itemCount: ${itemCount}`);
            if (!props || !props.height) return null;
            return (
              <List
                height={props.height}
                width={props.width}
                itemCount={itemCount}
                itemSize={60}
                itemData={itemData}
                onItemsRendered={handleItemsRendered}
              >
                {Row}
              </List>
            );
          }}
        </AutoSizer>
      </div>
    </div>
  );
}