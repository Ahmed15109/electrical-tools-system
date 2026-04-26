'use strict';
















const { ipcMain, BrowserWindow, dialog, app } = require('electron');
const fs   = require('fs');
const path = require('path');



function fmt(n) {
  if (n == null || isNaN(Number(n))) return '0.00 ج.م';
  return (Number(n) / 100).toLocaleString('ar-EG', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }) + ' ج.م';
}

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return String(d); }
}



function buildHTML({ customer, supplier, summary, transactions, installments }) {
  const isSupplier = !!supplier;
  const person = supplier || customer;
  const isInDebt = (summary.balance || 0) > 0;

  const sortedTransactions = (transactions || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const txRows = sortedTransactions.map((t, i) => {
    const isSale = t.type === 'sale';
    const isPurchase = t.type === 'purchase';
    const isIncome = isSale || (!isPurchase && t.type !== 'payment'); 

    const typeLabel = isSale ? '🛒 بيع' : isPurchase ? '🛒 شراء' : '💰 دفعة';
    const typeColor = (isSale || isPurchase) ? '#c0392b' : '#27ae60';


    const debitVal = isSupplier ? t.owed : t.debit;
    const creditVal = isSupplier ? t.paid : t.credit;

    const debit  = (debitVal  || 0) > 0 ? fmt(debitVal)  : '—';
    const credit = (creditVal || 0) > 0 ? fmt(creditVal) : '—';
    const bal    = fmt(Math.abs(t.balance || 0));
    const bg     = i % 2 === 0 ? '#ffffff' : '#f7f9ff';
    return `
      <tr style="background:${bg}">
        <td style="direction:ltr;text-align:right;white-space:nowrap">${fmtDate(t.date)}</td>
        <td style="color:${typeColor};font-weight:700">${typeLabel}</td>
        <td>${t.description || '—'}</td>
        <td style="color:#c0392b;font-weight:700;direction:ltr;text-align:right">${debit}</td>
        <td style="color:#27ae60;font-weight:700;direction:ltr;text-align:right">${credit}</td>
        <td style="font-weight:700;direction:ltr;text-align:right;color:${(t.balance||0)>0?'#d97706':'#27ae60'}">${bal}</td>
      </tr>`;
  }).join('');

  const instRows = (installments || []).map((inst, i) => {
    const overdue = inst.status === 'pending' && new Date(inst.dueDate) < new Date();
    const statusLabel = inst.status === 'paid' ? 'مدفوع' : overdue ? 'متأخر ⚠' : 'معلق';
    const statusColor = inst.status === 'paid' ? '#27ae60' : overdue ? '#c0392b' : '#d97706';
    const bg = i % 2 === 0 ? '#ffffff' : '#f7f9ff';
    return `
      <tr style="background:${bg}">
        <td style="text-align:center">${i + 1}</td>
        <td style="direction:ltr;text-align:right;color:${overdue?'#c0392b':'#111'}">${fmtDate(inst.dueDate)}</td>
        <td style="direction:ltr;text-align:right;font-weight:700">${fmt(inst.amount)}</td>
        <td style="color:${statusColor};font-weight:700">${statusLabel}</td>
        <td style="direction:ltr;text-align:right">${inst.paidAt ? fmtDate(inst.paidAt) : '—'}</td>
      </tr>`;
  }).join('');

  const installmentsSection = instRows ? `
    <div class="section-title">جدول الأقساط</div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>تاريخ الاستحقاق</th><th>المبلغ</th><th>الحالة</th><th>تاريخ الدفع</th>
        </tr>
      </thead>
      <tbody>${instRows}</tbody>
    </table>` : '';

  const txSection = txRows ? `
    <div class="section-title">كشف الحساب التفصيلي</div>
    <table>
      <thead>
        <tr>
          <th>التاريخ</th><th>نوع العملية</th><th>البيان</th>
          <th>${isSupplier ? 'عليك 🛒' : 'عليه 🛒'}</th><th>${isSupplier ? 'دفعت 💰' : 'دفع 💰'}</th><th>الرصيد بعد العملية</th>
        </tr>
      </thead>
      <tbody>${txRows}</tbody>
    </table>` : '<p style="color:#888;text-align:center;padding:2rem">لا يوجد تعاملات.</p>';

  const printDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>كشف حساب - ${person?.name || ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl; background: #ffffff; color: #111;
      padding: 36px 44px; font-size: 13px; line-height: 1.6;
    }

    /* ── Header ── */
    .header { border-bottom: 2.5px solid #1e3a5f; padding-bottom: 16px; margin-bottom: 22px; }
    .title   { font-size: 24px; font-weight: 800; color: #1e3a5f; }
    .sub     { font-size: 12px; color: #555; margin-top: 4px; }
    .info    { font-size: 13px; color: #333; margin-top: 10px; line-height: 1.9; }
    .info strong { color: #1e3a5f; }

    /* ── Balance pill ── */
    .balance-row { display: flex; align-items: center; gap: 16px; margin: 18px 0; }
    .balance-pill {
      display: inline-block; padding: 6px 20px; border-radius: 100px;
      font-size: 18px; font-weight: 800; direction: ltr;
      background: ${isInDebt ? '#fef2f2' : '#f0fdf4'};
      color: ${isInDebt ? '#c0392b' : '#27ae60'};
      border: 1.5px solid ${isInDebt ? '#fca5a5' : '#86efac'};
    }
    .balance-label { font-size: 12px; color: #666; }
    .balance-status { font-size: 12px; font-weight: 700; color: ${isInDebt ? '#c0392b' : '#27ae60'}; }

    /* ── Summary cards ── */
    .summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
    .scard { border: 1px solid #dde3f0; border-radius: 10px; padding: 14px 12px; background: #f7f9ff; }
    .scard-label { font-size: 11px; color: #666; margin-bottom: 5px; }
    .scard-val   { font-size: 17px; font-weight: 800; direction: ltr; text-align: right; }

    /* ── Section title ── */
    .section-title {
      font-size: 14px; font-weight: 800; color: #1e3a5f;
      border-right: 4px solid #1e3a5f; padding-right: 10px;
      margin: 24px 0 12px;
    }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
    thead tr { background: #1e3a5f !important; }
    th {
      color: #fff; padding: 9px 10px; text-align: right;
      font-weight: 600; font-size: 11.5px;
    }
    td { padding: 8px 10px; border-bottom: 1px solid #e8edf5; }

    /* ── Footer ── */
    .footer {
      margin-top: 28px; border-top: 1px solid #ccd; padding-top: 12px;
      display: flex; justify-content: space-between;
      font-size: 10.5px; color: #888;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="title">${isSupplier ? 'كشف حساب مورد' : 'كشف حساب عميل'}</div>
    <div class="sub">تاريخ الطباعة: ${printDate}</div>
    <div class="info">
      <strong>${isSupplier ? 'المورد' : 'العميل'}:</strong> ${person?.name || '—'}
      ${person?.phone    ? ` &nbsp;|&nbsp; <strong>هاتف:</strong> ${person.phone}` : ''}
      ${person?.address  ? ` &nbsp;|&nbsp; <strong>العنوان:</strong> ${person.address}` : ''}
    </div>
  </div>

  <!-- Balance -->
  <div class="balance-row">
    <div>
      <div class="balance-label">الرصيد الحالي</div>
      <div class="balance-pill">${fmt(Math.abs(summary.balance || 0))}</div>
      <div class="balance-status">${isSupplier ? (isInDebt ? '● عليك رصيد للمورد' : '● المورد خالص') : (isInDebt ? '● العميل عليه رصيد' : '● العميل خالص')}</div>
    </div>
  </div>

  <!-- Summary -->
  <div class="summary">
    <div class="scard">
      <div class="scard-label">إجمالي المشتريات</div>
      <div class="scard-val" style="color:#c0392b">${fmt(isSupplier ? summary.totalPurchases : summary.totalSales)}</div>
    </div>
    <div class="scard">
      <div class="scard-label">إجمالي المدفوع</div>
      <div class="scard-val" style="color:#27ae60">${fmt(summary.totalPaid)}</div>
    </div>
    <div class="scard">
      <div class="scard-label">المتبقي (الرصيد)</div>
      <div class="scard-val" style="color:${isInDebt?'#d97706':'#27ae60'}">${fmt(Math.abs(summary.balance || 0))}</div>
    </div>
    ${!isSupplier ? `
    <div class="scard">
      <div class="scard-label">أقساط متأخرة</div>
      <div class="scard-val" style="color:#c0392b">${summary.overdueCount ?? 0}</div>
    </div>` : ''}
  </div>

  <!-- Transactions -->
  ${txSection}

  <!-- Installments -->
  ${installmentsSection}

  <!-- Footer -->
  <div class="footer">
    <span>تم التوليد بواسطة المنظومة — ${new Date().toLocaleString('ar-EG')}</span>
    <span>سري وخاص ب${isSupplier ? 'المورد' : 'العميل'}</span>
  </div>

</body>
</html>`;
}



function registerPdfHandlers() {
  ipcMain.handle('pdf:generate', async (_event, payload) => {
    const { customer, supplier, summary, transactions, installments } = payload || {};


    const html = buildHTML({ customer, supplier, summary, transactions, installments });


    const person = supplier || customer;
    const defaultName = `كشف-حساب-${person?.name || 'مورد-عميل'}-${new Date().toISOString().slice(0,10)}.pdf`;
    const defaultPath = path.join(app.getPath('downloads'), defaultName);


    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'حفظ كشف الحساب كـ PDF',
      defaultPath,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    });

    if (canceled || !filePath) return { success: false, reason: 'cancelled' };


    const win = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    try {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);


      await new Promise(r => setTimeout(r, 400));

      const pdfBuffer = await win.webContents.printToPDF({
        pageSize:         'A4',
        printBackground:  true,
        margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 },
      });

      fs.writeFileSync(filePath, pdfBuffer);
      return { success: true, path: filePath };
    } finally {
      if (!win.isDestroyed()) win.destroy();
    }
  });
}

module.exports = { registerPdfHandlers };
