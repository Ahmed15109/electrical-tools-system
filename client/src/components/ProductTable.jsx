import { memo } from 'react';
import { Package, Edit, Trash2 } from 'lucide-react';
import { formatNumber, formatCurrency } from '../utils/normalize';


const ProductTable = ({ products, onEdit, onDelete }) => {
  if (!products || products.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Package size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.2 }} />
        <p>لا يوجد منتجات حالياً</p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>اسم المنتج</th>
            <th>الفئة</th>
            <th>السعر</th>
            <th>الكمية الحالية</th>
            <th style={{ textAlign: 'center' }}>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const productId = product.id || product._id;
            return (
              <tr key={productId}>
                <td style={{ fontWeight: '600', color: 'var(--accent)' }}>{product.name}</td>
                <td style={{ color: 'var(--text-muted)' }}>
                  {product.category === 'General' ? 'عام' : product.category || 'عام'}
                </td>
                <td style={{ fontWeight: '600', color: 'var(--success)', direction: 'ltr', textAlign: 'right' }}>
                  {formatCurrency(product.price)}
                </td>
                <td style={{ 
                  color: product.stock > 10 ? 'var(--text-muted)' : 'var(--warning)', 
                  fontWeight: product.stock <= 10 ? '600' : '400' 
                }}>
                  {formatNumber(product.stock)} وحدات
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                    <button 
                      onClick={() => onEdit(product)}
                      className="btn-icon"
                      style={{ color: 'var(--accent)', background: 'rgba(59, 130, 246, 0.1)', padding: '0.4rem', borderRadius: '4px' }}
                      title="تعديل المنتج"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(productId)}
                      className="btn-icon"
                      style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.4rem', borderRadius: '4px' }}
                      title="حذف المنتج"
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

export default memo(ProductTable);
