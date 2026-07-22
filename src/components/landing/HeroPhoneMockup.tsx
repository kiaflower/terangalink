import { ShoppingBag, MessageCircle, CheckCheck, Star } from 'lucide-react'

interface HeroProduct {
  name: string
  price: number
  image: string
  restaurantName: string
  variant: { label: string; value: string } | null
}

interface HeroPhoneMockupProps {
  product: HeroProduct | null
  orderMessage: string | null
}

function formatPrice(price: number) {
  return `${new Intl.NumberFormat('fr-SN').format(price)} FCFA`
}

// Regroupe les lignes du message (séparées par des lignes vides, comme dans le vrai
// message WhatsApp) en blocs, pour un espacement visuel façon paragraphes plutôt que
// d'afficher des lignes vides littérales dans la bulle.
function messageBlocks(message: string): string[][] {
  const blocks: string[][] = [[]]
  for (const line of message.split('\n')) {
    if (line === '') {
      if (blocks[blocks.length - 1].length > 0) blocks.push([])
    } else {
      blocks[blocks.length - 1].push(line)
    }
  }
  return blocks.filter(b => b.length > 0)
}

// Le vrai message utilise *...* pour le gras (syntaxe WhatsApp) — on le restitue tel
// quel dans la bulle plutôt que de laisser les astérisques bruts.
function renderLine(line: string, key: number) {
  const parts = line.split(/(\*[^*]+\*)/g).filter(Boolean)
  return (
    <p key={key} className="text-[6.5px] leading-[1.5] text-gray-600 break-words">
      {parts.map((part, i) =>
        part.startsWith('*') && part.endsWith('*')
          ? <strong key={i} className="font-bold text-gray-900">{part.slice(1, -1)}</strong>
          : part
      )}
    </p>
  )
}

// Illustration décorative du hero : deux téléphones superposés (vitrine restaurant +
// conversation WhatsApp), avec le même cadre que RestaurantPhoneDemo (rounded-[2.5rem]
// border-8 border-gray-900) pour rester cohérent avec le reste du site. `product` est un
// vrai plat d'un restaurant démo (photo, nom, prix, restaurant) et `orderMessage` le texte
// exact que génère src/lib/utils#buildWhatsAppMessage pour une vraie commande — rien n'est
// inventé, seuls le client et l'adresse sont un exemple. Si aucun plat démo n'est
// disponible, on retombe sur un aperçu générique plutôt que d'inventer un contenu.
export function HeroPhoneMockup({ product, orderMessage }: HeroPhoneMockupProps) {
  const productPrice = product ? formatPrice(product.price) : '19 900 FCFA'
  const blocks = orderMessage ? messageBlocks(orderMessage) : null

  return (
    <div className="relative mx-auto w-full max-w-[380px] h-[460px] sm:h-[520px] md:h-[560px] select-none">

      {/* Téléphone arrière — vitrine restaurant */}
      <div className="absolute left-2 sm:left-4 top-2 sm:top-4 w-[130px] sm:w-[150px] md:w-[165px] -rotate-6 rounded-[2rem] border-[6px] border-gray-900 bg-white overflow-hidden shadow-2xl">
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-100">
          <div className="w-3.5 h-3.5 rounded-full bg-brand-orange flex-shrink-0" />
          {product ? (
            <p className="text-[7px] font-bold text-gray-800 truncate">{product.restaurantName}</p>
          ) : (
            <div className="h-1.5 w-14 rounded-full bg-gray-200" />
          )}
          <div className="ml-auto flex items-center gap-0.5 flex-shrink-0">
            <Star className="w-2 h-2 fill-amber-400 text-amber-400" />
            <span className="text-[6px] font-semibold text-gray-400">4.8</span>
          </div>
        </div>
        <div className="m-1.5 aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
          {product ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag className="w-5 h-5 text-orange-300" />
          )}
        </div>
        <div className="px-2 space-y-0.5 mb-1.5">
          {product && <p className="text-[7px] font-semibold text-gray-700 truncate">{product.name}</p>}
          <p className="text-[9px] font-bold text-brand-orange">{productPrice}</p>
        </div>
        <div className="mx-2 mb-2 rounded-md bg-brand-orange py-1 text-center text-[7px] font-bold text-white">
          Commander sur WhatsApp
        </div>
      </div>

      {/* Téléphone avant — conversation WhatsApp, message réel */}
      <div className="absolute right-0 bottom-0 z-10 w-[200px] sm:w-[225px] md:w-[245px] rotate-3 rounded-[2rem] border-[6px] border-gray-900 bg-white overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-2.5 py-2" style={{ backgroundColor: '#075E54' }}>
          <MessageCircle className="w-3.5 h-3.5 text-white flex-shrink-0" />
          <div>
            <p className="text-[7px] font-semibold text-white leading-tight">Client</p>
            <p className="text-[6px] text-white/70 leading-tight">en ligne</p>
          </div>
        </div>
        <div className="p-2 flex flex-col gap-1" style={{ backgroundColor: '#ECE5DD' }}>
          {blocks ? (
            <div className="bg-white rounded-lg rounded-tl-none px-2 py-1.5 shadow-sm">
              {blocks.map((block, i) => (
                <div key={i} className={i > 0 ? 'mt-1' : ''}>
                  {block.map((line, j) => renderLine(line, j))}
                </div>
              ))}
              <div className="flex justify-end items-center gap-0.5 mt-1">
                <CheckCheck className="w-2 h-2 text-sky-500" />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg rounded-tl-none px-2 py-1.5 shadow-sm">
              <p className="text-[7px] font-bold text-gray-900">Nouvelle commande</p>
              <p className="text-[7px] text-gray-500 mt-0.5">Plat — Thiéboudienne</p>
              <p className="text-[8px] font-bold text-gray-900 mt-1 pt-1 border-t border-gray-100">Total — {productPrice}</p>
            </div>
          )}
          <div className="self-end flex items-center gap-1 rounded-lg rounded-tr-none px-2 py-1 max-w-[85%]" style={{ backgroundColor: '#DCF8C6' }}>
            <p className="text-[7px] text-gray-700">Votre commande a bien été prise en compte</p>
            <CheckCheck className="w-2.5 h-2.5 text-sky-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Bulles flottantes — reprennent le texte des sections « Comment ça marche » et « Fonctionnalités » plus bas.
          Positionnées dans les coins vides laissés par les deux téléphones (haut-droite / bas-gauche) pour ne pas
          recouvrir leur contenu. */}
      <div className="absolute top-0 right-0 z-20 rounded-xl border border-white/15 bg-white/[0.06] backdrop-blur-sm px-3 py-2 shadow-lg max-w-[130px]">
        <p className="text-[10px] sm:text-xs font-semibold text-white leading-snug">Vos clients commandent seuls</p>
      </div>
      <div className="absolute bottom-0 left-0 z-20 rounded-xl border border-white/15 bg-white/[0.06] backdrop-blur-sm px-3 py-2 shadow-lg max-w-[130px]">
        <p className="text-[10px] sm:text-xs font-semibold text-white leading-snug">Fini les DM à rallonge</p>
      </div>
    </div>
  )
}
