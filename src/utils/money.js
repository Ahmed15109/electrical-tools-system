/**
 * Comprehensive Financial Utility for Integer-Based Currency (Cents/Piasters)
 * Ensures 100% precision with zero floating point carry-over.
 */

const toSafeNumber = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'bigint') return Number(val);
    return Number(val) || 0;
};

// Basic Conversions
const toCents = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 0;
    // Round to handle cases where input might be a float string
    return Math.round(Number(val) * 100);
};

const fromCents = (cents) => {
    if (!cents) return 0;
    return toSafeNumber(cents) / 100;
};

/**
 * Calculates interest based on basis points (BPS)
 * 1% = 100 BPS, 12.5% = 1250 BPS
 * Formula: (Amount * BPS) / 10000
 */
const calculateInterest = (amountInCents, basisPoints) => {
    const bps = Number(basisPoints) || 0;
    if (bps === 0) return 0;
    
    // Integer-safe rounding: (a * b + 5000) / 10000 is equivalent to round((a*b)/10000)
    // using pure integer math logic.
    const result = (BigInt(toSafeNumber(amountInCents)) * BigInt(bps) + 5000n) / 10000n;
    return Number(result);
};

/**
 * Distributes a total amount into N installments
 * Ensures the sum of all installments exactly matches the total.
 * Remainder is added to the LAST installment as per user requirement.
 */
const distributeInstallments = (totalInCents, numMonths) => {
    const months = Number(numMonths);
    if (months <= 0) return [];
    if (months === 1) return [toSafeNumber(totalInCents)];

    const total = BigInt(toSafeNumber(totalInCents));
    const baseAmount = total / BigInt(months);
    const installments = new Array(months).fill(baseAmount);
    
    const sumCalculated = baseAmount * BigInt(months);
    const remainder = total - sumCalculated;
    
    // Add remainder to the last installment
    installments[months - 1] += remainder;
    
    // Return as Number for Sequelize storage (integers)
    return installments.map(n => Number(n));
};

module.exports = {
    toSafeNumber,
    toCents,
    fromCents,
    calculateInterest,
    distributeInstallments
};
