import { Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from '@react-email/components'
import type { NewsletterBlock } from '@/lib/types/database'
import { sanitizeRichText } from '../sanitizeHtml'

const BRAND_VIOLET = '#7C3AED'

interface CampaignEmailProps {
  blocks: NewsletterBlock[]
  previewText?: string
  unsubscribeUrl: string | null
  pixelUrl: string | null
  logoUrl: string
}

// Habillage unique (bandeau de marque + carte + pied de page) appliqué à toutes les
// campagnes — le contenu des blocs vient s'insérer dans la Section blanche ci-dessous.
export function CampaignEmail({ blocks, previewText, unsubscribeUrl, pixelUrl, logoUrl }: CampaignEmailProps) {
  return (
    <Html>
      <Head />
      {previewText ? <Preview>{previewText}</Preview> : null}
      <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', padding: 0 }}>
          <Section style={{ backgroundColor: BRAND_VIOLET, borderRadius: '12px 12px 0 0', padding: '28px 24px', textAlign: 'center' }}>
            <Img
              src={logoUrl}
              alt="TerangaSpot"
              width="44"
              height="44"
              style={{ width: 44, height: 44, borderRadius: 10, margin: '0 auto 8px' }}
            />
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5, margin: 0 }}>TerangaSpot</Text>
          </Section>
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '0 0 12px 12px', padding: '32px 24px' }}>
            {blocks.map(block => <BlockRenderer key={block.id} block={block} />)}
            <Hr style={{ borderColor: '#e5e7eb', margin: '32px 0 16px' }} />
            <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', margin: '0 0 4px' }}>
              TerangaSpot{unsubscribeUrl ? (
                <>
                  {' — '}
                  <Link href={unsubscribeUrl} style={{ color: '#9ca3af', textDecoration: 'underline' }}>Se désabonner</Link>
                </>
              ) : null}
            </Text>
            <Text style={{ fontSize: 11, color: '#c1c5cc', textAlign: 'center', margin: 0 }}>
              Vous recevez cet email car vous êtes inscrit(e) sur TerangaSpot.
            </Text>
          </Section>
        </Container>
        {pixelUrl ? <Img src={pixelUrl} width="1" height="1" alt="" style={{ display: 'none' }} /> : null}
      </Body>
    </Html>
  )
}

function BlockRenderer({ block }: { block: NewsletterBlock }) {
  switch (block.type) {
    case 'title':
      return (
        <Heading
          as="h2"
          style={{ textAlign: block.align ?? 'left', color: '#111827', fontSize: 22, margin: '0 0 12px' }}
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.text) }}
        />
      )
    case 'paragraph':
      return (
        <Text
          style={{ color: '#374151', fontSize: 15, lineHeight: '24px', margin: '0 0 16px' }}
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.text) }}
        />
      )
    case 'image': {
      if (!block.url) return null
      const img = (
        <Img src={block.url} alt={block.alt ?? ''} style={{ width: '100%', maxWidth: 552, borderRadius: 8, margin: '0 0 16px' }} />
      )
      return block.linkUrl ? <Link href={block.linkUrl}>{img}</Link> : img
    }
    case 'button':
      if (!block.url) return null
      return (
        <Section style={{ textAlign: 'center', margin: '0 0 16px' }}>
          <Button
            href={block.url}
            style={{ backgroundColor: BRAND_VIOLET, color: '#ffffff', padding: '12px 24px', borderRadius: 8, fontSize: 15, textDecoration: 'none' }}
          >
            {block.text}
          </Button>
        </Section>
      )
    case 'spacer':
      return <div style={{ height: block.height }} />
    default:
      return null
  }
}
