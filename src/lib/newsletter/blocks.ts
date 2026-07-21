import type { NewsletterBlock } from '@/lib/types/database'
import { sanitizeRichText } from './sanitizeHtml'

let counter = 0
export function newBlockId(): string {
  counter += 1
  return `b${Date.now().toString(36)}${counter}`
}

export function createBlock(type: NewsletterBlock['type']): NewsletterBlock {
  const id = newBlockId()
  switch (type) {
    case 'title': return { id, type: 'title', text: 'Titre', align: 'left' }
    case 'paragraph': return { id, type: 'paragraph', text: '' }
    case 'image': return { id, type: 'image', url: '', alt: '' }
    case 'button': return { id, type: 'button', text: 'En savoir plus', url: '' }
    case 'spacer': return { id, type: 'spacer', height: 24 }
  }
}

export function isValidBlock(b: unknown): b is NewsletterBlock {
  if (!b || typeof b !== 'object') return false
  const block = b as Record<string, unknown>
  if (typeof block.id !== 'string') return false
  switch (block.type) {
    case 'title': return typeof block.text === 'string'
    case 'paragraph': return typeof block.text === 'string'
    case 'image': return typeof block.url === 'string'
    case 'button': return typeof block.text === 'string' && typeof block.url === 'string'
    case 'spacer': return typeof block.height === 'number'
    default: return false
  }
}

export function sanitizeBlocks(blocks: unknown): NewsletterBlock[] {
  if (!Array.isArray(blocks)) return []
  return blocks.filter(isValidBlock).map(b => {
    if (b.type === 'title' || b.type === 'paragraph') return { ...b, text: sanitizeRichText(b.text) }
    return b
  })
}

export const BLOCK_LABELS: Record<NewsletterBlock['type'], string> = {
  title: 'Titre',
  paragraph: 'Paragraphe',
  image: 'Image',
  button: 'Bouton',
  spacer: 'Espacement',
}

export const BLOCK_TYPES: NewsletterBlock['type'][] = ['title', 'paragraph', 'image', 'button', 'spacer']
