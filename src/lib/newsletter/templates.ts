import { newBlockId } from './blocks'
import type { NewsletterBlock } from '@/lib/types/database'

export interface CampaignTemplate {
  id: string
  label: string
  description: string
  subject: string
  blocks: () => NewsletterBlock[]
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'blank',
    label: 'Vierge',
    description: 'Partir d’une page blanche.',
    subject: '',
    blocks: () => [],
  },
  {
    id: 'announcement',
    label: 'Annonce / Actualité',
    description: 'Un titre, un texte, un bouton — pour une annonce simple.',
    subject: 'Une nouveauté chez TerangaLink',
    blocks: () => [
      { id: newBlockId(), type: 'title', text: 'Une nouveauté chez TerangaLink', align: 'left' },
      { id: newBlockId(), type: 'paragraph', text: 'Nous avons une nouveauté à vous annoncer…' },
      { id: newBlockId(), type: 'spacer', height: 16 },
      { id: newBlockId(), type: 'button', text: 'En savoir plus', url: 'https://teranga-link.com' },
    ],
  },
  {
    id: 'promo',
    label: 'Promotion',
    description: 'Image, texte et bouton d’appel à l’action.',
    subject: 'Une offre spéciale pour votre restaurant',
    blocks: () => [
      { id: newBlockId(), type: 'title', text: 'Une offre spéciale pour vous', align: 'center' },
      { id: newBlockId(), type: 'image', url: '', alt: '' },
      { id: newBlockId(), type: 'paragraph', text: 'Profitez de cette offre limitée dans le temps…' },
      { id: newBlockId(), type: 'button', text: 'J’en profite', url: 'https://teranga-link.com' },
    ],
  },
  {
    id: 'newsletter',
    label: 'Newsletter mensuelle',
    description: 'Plusieurs sections pour un point d’actualité complet.',
    subject: 'Le point du mois — TerangaLink',
    blocks: () => [
      { id: newBlockId(), type: 'title', text: 'Le point du mois', align: 'left' },
      { id: newBlockId(), type: 'paragraph', text: 'Voici les actualités TerangaLink de ce mois-ci.' },
      { id: newBlockId(), type: 'spacer', height: 24 },
      { id: newBlockId(), type: 'title', text: 'À la une', align: 'left' },
      { id: newBlockId(), type: 'paragraph', text: '…' },
      { id: newBlockId(), type: 'spacer', height: 8 },
      { id: newBlockId(), type: 'button', text: 'Découvrir', url: 'https://teranga-link.com' },
    ],
  },
]
