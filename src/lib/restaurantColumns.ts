// Colonnes de `restaurants` lisibles avec la clé publique (sécurité, 7 octobre
// 2026). Plus de mot de passe admin chiffré, propriétaire, version de mot de
// passe ni consentement newsletter pour les visiteurs : un select('*') sur
// `restaurants` avec un client non-admin échouerait, utiliser cette liste.
export const RESTAURANT_PUBLIC_COLUMNS = [
  'id', 'name', 'slug', 'description', 'logo_url', 'cover_url', 'banner_url', 'phone', 'whatsapp_number', 'address', 'city',
  'cuisine_type', 'is_active', 'is_verified', 'is_demo', 'latitude', 'longitude', 'primary_color', 'background_color',
  'button_color', 'theme_mode', 'facebook_url', 'instagram_url', 'tiktok_url', 'snapchat_url', 'wave_number',
  'orange_money_number', 'show_delivery_info', 'delivery_info', 'created_at', 'updated_at', 'referral_code', 'referred_by',
  'theme', 'referred_by_code', 'opening_hours', 'is_boosted', 'is_founder', 'announcement_enabled', 'announcement_image_url',
  'announcement_title', 'last_login_at',
].join(', ') as '*'
// Le type reste '*' pour garder le typage des lignes ; la valeur envoyée est la liste ci-dessus.
