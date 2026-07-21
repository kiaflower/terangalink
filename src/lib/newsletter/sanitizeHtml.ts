import sanitizeHtml from 'sanitize-html'
import { RICH_TEXT_COLORS, RICH_TEXT_SIZES } from './richTextConstants'

// Couleur et taille sont restreintes aux valeurs exactes proposées par la toolbar (pas de
// plage libre) — un style="font-size: 999px" forgé à la main casserait sinon la mise en page email.
const COLOR_PATTERN = new RegExp(`^(${RICH_TEXT_COLORS.map(c => c.value).join('|')})$`, 'i')
const SIZE_PATTERN = new RegExp(`^(${RICH_TEXT_SIZES.map(s => s.value).join('|')})$`)

/**
 * Restreint le HTML des blocs Titre/Paragraphe à un sous-ensemble compatible email
 * (gras/italique/souligné/couleur/taille) et sûr, quelle que soit la source (éditeur riche
 * côté client ou écriture directe en base, ex. script de seed).
 *
 * Basé sur `sanitize-html` (pur JS, sans DOM) plutôt que DOMPurify — isomorphic-dompurify
 * embarque jsdom, qui casse au démarrage des fonctions serverless Vercel.
 */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['b', 'i', 'u', 'span', 'br'],
    allowedAttributes: { span: ['style'] },
    allowedStyles: {
      span: {
        color: [COLOR_PATTERN],
        'font-weight': [/^(bold|normal)$/],
        'font-size': [SIZE_PATTERN],
        'text-decoration': [/^(underline|none)$/],
      },
    },
  })
}
