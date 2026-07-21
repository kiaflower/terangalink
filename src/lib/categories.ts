export const SHOP_CATEGORIES = [
  'Mode & Vêtements',
  'Chaussures & Maroquinerie',
  'Beauté & Cosmétiques',
  'Parfums',
  'Bijoux & Accessoires',
  'Électronique & High-Tech',
  'Téléphones & Accessoires',
  'Électroménager',
  'Meubles & Décoration',
  'Art & Artisanat',
  'Librairie & Papeterie',
  'Jouets & Enfants',
  'Sport & Fitness',
  'Alimentation & Épicerie',
  'Santé & Bien-être',
  'Fleurs & Plantes',
  'Services & Prestations',
  'Articles variés',
] as const

export type ShopCategory = typeof SHOP_CATEGORIES[number]

export const SHOP_CATEGORY_OPTIONS = [
  { value: '', label: 'Choisir une catégorie...' },
  ...SHOP_CATEGORIES.map(t => ({ value: t, label: t })),
]

export const SHOP_CATEGORY_FILTER_OPTIONS = ['Toutes les catégories', ...SHOP_CATEGORIES]
