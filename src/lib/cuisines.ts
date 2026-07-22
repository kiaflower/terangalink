export const CUISINE_TYPES = [
  'Cuisine sénégalaise',
  'Cuisine africaine',
  'Cuisine internationale',
  'Fast-food',
  'Street food',
  'Grillades & Barbecue',
  'Fruits de mer',
  'Poissonnerie / Poissons grillés',
  'Pizzeria',
  'Burgers',
  'Tacos & Sandwichs',
  'Poulet',
  'Cuisine asiatique',
  'Cuisine libanaise',
  'Cuisine italienne',
  'Cuisine française',
  'Cuisine indienne',
  'Pâtisserie',
  'Boulangerie',
  'Glacerie',
  'Crêpes & Gaufres',
  'Desserts',
  'Brunch',
  'Petit-déjeuner',
  'Café',
  'Salon de thé',
  'Jus & Smoothies',
  'Bubble Tea',
  'Traiteur',
  'Plateaux repas',
  'Cocktails & Buffets',
] as const

export type CuisineType = typeof CUISINE_TYPES[number]

export const CUISINE_OPTIONS = [
  { value: '', label: 'Choisir un type...' },
  ...CUISINE_TYPES.map(t => ({ value: t, label: t })),
]

export const CUISINE_FILTER_OPTIONS = ['Tous les types', ...CUISINE_TYPES]
