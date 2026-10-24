const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'USD',
  // es-ES omite el separador de miles en cifras de 4 dígitos; se fuerza para que sea uniforme.
  useGrouping: 'always',
})

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/** 14850 → "14.850,00 US$" */
export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

/** "2026-10-24T10:00:00Z" → "24 oct 2026" */
export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value)).replace(/\./g, '')
}
