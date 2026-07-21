import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const boutiqueName = searchParams.get('boutiqueName') || 'Boutique'
  const boutiqueAddress = searchParams.get('boutiqueAddress') || ''
  const boutiquePhone = searchParams.get('boutiquePhone') || ''
  const orderNumber = searchParams.get('orderNumber') || ''
  const date = searchParams.get('date') || ''
  const customerName = searchParams.get('customerName') || '-'
  const customerPhone = searchParams.get('customerPhone') || ''
  const total = searchParams.get('total') || '0'
  const discountAmount = parseInt(searchParams.get('discountAmount') || '0', 10)
  const paymentLabel = searchParams.get('paymentLabel') || 'Especes'
  const isPreorder = searchParams.get('isPreorder') === '1'
  const deliveryDate = searchParams.get('deliveryDate') || ''
  const accentColor = searchParams.get('accentColor') || '#7C3AED'
  const itemsRaw = searchParams.get('items') || '[]'
  const items: { name: string; quantity: number; price: number }[] = JSON.parse(decodeURIComponent(itemsRaw))
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return new ImageResponse(
    (
      <div
        style={{
          width: 600,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '"Helvetica Neue", Arial, sans-serif',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: accentColor,
            padding: '36px 40px 28px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 6 }}>
            {boutiqueName}
          </div>
          {boutiqueAddress && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 18 }}>
              {boutiqueAddress.toUpperCase()}
            </div>
          )}
          <div
            style={{
              border: '2px solid rgba(255,255,255,0.6)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '5px 20px',
              borderRadius: 20,
              letterSpacing: 2,
            }}
          >
            {isPreorder ? 'REÇU DE PRÉCOMMANDE' : 'REÇU DE COMMANDE'}
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* N° commande */}
          <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 20, borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 2, marginBottom: 6 }}>N° COMMANDE</div>
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 900, color: '#111' }}>#{orderNumber}</div>
          </div>

          {/* Date */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 2, marginBottom: 6 }}>DATE</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{date}</div>
          </div>

          {/* Client */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 2, marginBottom: 6 }}>CLIENT</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{customerName}</div>
            {customerPhone && <div style={{ fontSize: 13, color: '#888', marginTop: 3 }}>{customerPhone}</div>}
          </div>

          {/* Précommande */}
          {isPreorder && (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0', borderBottom: '1px solid #eee' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 2, marginBottom: 8 }}>PRÉCOMMANDE</div>
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  background: '#FEF3C7',
                  color: '#B45309',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '5px 14px',
                  borderRadius: 8,
                  marginBottom: deliveryDate ? 8 : 0,
                }}
              >
                Cette commande est une précommande
              </div>
              {deliveryDate && (
                <div style={{ fontSize: 14, color: '#111' }}>
                  Livraison prévue : <span style={{ fontWeight: 700 }}>{deliveryDate}</span>
                </div>
              )}
            </div>
          )}

          {/* Articles */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 2, marginBottom: 14 }}>ARTICLES</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
                <div style={{ fontSize: 15, color: '#111', fontWeight: 500 }}>{item.name}</div>
                <div style={{ display: 'flex', fontSize: 12, color: '#999', marginTop: 3 }}>
                  {item.quantity} x {item.price.toLocaleString('fr-SN')} FCFA
                  {'  =  '}
                  <span style={{ color: '#111', fontWeight: 700 }}>
                    {(item.price * item.quantity).toLocaleString('fr-SN')} FCFA
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Réduction */}
          {discountAmount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0', borderBottom: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#999' }}>
                <span>Sous-total</span>
                <span>{subtotal.toLocaleString('fr-SN')} FCFA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#059669', marginTop: 6 }}>
                <span>Code promo</span>
                <span>-{discountAmount.toLocaleString('fr-SN')} FCFA</span>
              </div>
            </div>
          )}

          {/* Total */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 2, marginBottom: 8 }}>TOTAL</div>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 900, color: accentColor }}>{parseInt(total, 10).toLocaleString('fr-SN')} FCFA</div>
          </div>

          {/* Paiement */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 2, marginBottom: 10 }}>MODE DE PAIEMENT</div>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                background: `${accentColor}20`,
                color: accentColor,
                fontSize: 14,
                fontWeight: 700,
                padding: '6px 16px',
                borderRadius: 8,
              }}
            >
              {paymentLabel}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 6 }}>
              Merci pour votre commande !
            </div>
            {boutiquePhone && (
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>{boutiquePhone}</div>
            )}
            <div style={{ display: 'flex', fontSize: 11, color: '#ccc', marginTop: 6 }}>
              Propulsé par{' '}
              <span style={{ color: accentColor, fontWeight: 700 }}>TerangaSpot</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 1000,
    }
  )
}
