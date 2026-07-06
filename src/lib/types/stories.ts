// ─── Stories éphémères (24h) ──────────────────────────────────────────────────

export interface Story {
  id: string
  restaurant_id: string
  media_type: 'image' | 'video'
  media_url: string
  caption: string | null
  menu_item_id: string | null
  view_count: number
  like_count: number
  created_at: string
  expires_at: string
}

export interface StoryMenuItemSummary {
  id: string
  name: string
  price: number
  image_url: string | null
}

export interface StoryRestaurantSummary {
  id: string
  name: string
  slug: string
  logo_url: string | null
}

export interface StoryWithRelations extends Story {
  restaurant: StoryRestaurantSummary
  menu_item: StoryMenuItemSummary | null
}

// Un groupe = un restaurant (un seul avatar dans la rangée, quel que soit le nb de stories)
export interface RestaurantStoryGroup {
  restaurant: StoryRestaurantSummary
  stories: StoryWithRelations[] // triées created_at ASC
}
