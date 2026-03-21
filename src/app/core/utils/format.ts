export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

export function formatVotes(votes: number): string {
  return new Intl.NumberFormat('id-ID').format(votes);
}
