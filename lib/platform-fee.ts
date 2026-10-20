/**
 * YOUTENT marketplace platform fee.
 * Up to ₹499: 20%
 * ₹500–₹1,999: 15%
 * ₹2,000 and above: 10%
 *
 * The user's requested bands mention ₹499, ₹999 and ₹2,000; the 500–998 gap
 * is treated as part of the 15% middle tier so every possible price has a fee.
 */
export function platformFeeRate(amount: number): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value <= 499 ? 20 : value < 2000 ? 15 : 10;
}

export function calculatePlatformFee(amount: number): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const rate = value <= 499 ? 0.20 : value < 2000 ? 0.15 : 0.10;
  return Math.round(value * rate * 100) / 100;
}
