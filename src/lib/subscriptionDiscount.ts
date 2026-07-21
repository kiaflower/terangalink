interface DiscountFields {
  discount_percent: number | null
  discount_expires_at: string | null
}

interface PendingDiscountFields {
  pending_discount_percent: number | null
}

export function getActiveDiscount(sub: DiscountFields): { percent: number; expiresAt: string } | null {
  if (sub.discount_percent && sub.discount_expires_at && new Date(sub.discount_expires_at) > new Date()) {
    return { percent: sub.discount_percent, expiresAt: sub.discount_expires_at }
  }
  return null
}

export function getPendingDiscount(sub: PendingDiscountFields): { percent: number } | null {
  return sub.pending_discount_percent ? { percent: sub.pending_discount_percent } : null
}
