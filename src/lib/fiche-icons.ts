import {
  Target, Smartphone, MessageCircle, ShoppingBag, Handshake, Timer, BarChart3,
  Sparkles, Camera, Truck, Heart, Bot, Wallet, FileText, type LucideIcon,
} from 'lucide-react'

export const FICHE_CATEGORY_ICONS: Record<string, LucideIcon> = {
  target: Target,
  smartphone: Smartphone,
  'message-circle': MessageCircle,
  'shopping-bag': ShoppingBag,
  handshake: Handshake,
  timer: Timer,
  'bar-chart-3': BarChart3,
  sparkles: Sparkles,
  camera: Camera,
  truck: Truck,
  heart: Heart,
  bot: Bot,
  wallet: Wallet,
}

export function ficheCategoryIcon(icon: string): LucideIcon {
  return FICHE_CATEGORY_ICONS[icon] ?? FileText
}
