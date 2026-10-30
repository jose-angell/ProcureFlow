interface PricedItem {
  quantity: number
  unitPrice: number
}

export function getItemSubtotal(item: PricedItem): number {
  return Math.round(item.quantity * item.unitPrice * 100) / 100
}

/** Importe total estimado: suma de cantidad × precio. */
export function getItemsTotal(items: PricedItem[]): number {
  return items.reduce((total, item) => total + getItemSubtotal(item), 0)
}
