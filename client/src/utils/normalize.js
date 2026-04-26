export const normalizeArabicDigits = (str) => {
  if (typeof str !== 'string') return str;
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (char) => arabicNumbers.indexOf(char));
};

export const normalizeNumberInput = (val) => {
  if (!val) return val;
  const normalizedStr = normalizeArabicDigits(val.toString());
  return normalizedStr;
};

export const formatNumber = (val) => {
  if (val === null || val === undefined) return '0';
  return Number(val).toLocaleString('en-US');
};

export const formatCurrency = (valCents) => {
  try {
    if (valCents === null || valCents === undefined || isNaN(Number(valCents))) return '0.00 ج.م';
    const amount = Number(valCents) / 100;
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' ج.م';
  } catch (err) {
    console.error("[normalize.js] formatCurrency CRASH:", err);
    return '0.00 ج.م';
  }
};

export const toCentsLocal = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  
  let num;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^\d.]/g, '');
    num = parseFloat(cleaned);
  } else {
    num = Number(val);
  }

  if (isNaN(num)) return 0;

  // Double Conversion Guard
  if (num > 1000000) {
    console.warn(`[toCentsLocal] Large EGP value detected: ${num}. Verify this is not already in cents.`);
  }

  return Math.round(num * 100);
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';

  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};
