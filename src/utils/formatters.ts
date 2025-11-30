/**
 * Formate un montant avec des espaces comme séparateurs de milliers
 * Exemple: 216500.00 -> "216 500.00"
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
