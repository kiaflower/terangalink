interface LowStockNoticeProps {
  trackStock: boolean
  stockQuantity: number | null
  className?: string
}

// Affiché uniquement à partir de 10 unités restantes (et pas en dessous de 1,
// le cas "0 en stock" étant déjà couvert ailleurs par is_available).
export function LowStockNotice({ trackStock, stockQuantity, className }: LowStockNoticeProps) {
  if (!trackStock || stockQuantity == null || stockQuantity < 1 || stockQuantity > 10) return null
  return (
    <p className={className ?? 'text-xs font-semibold text-orange-500'}>
      Plus que {stockQuantity} en stock
    </p>
  )
}
