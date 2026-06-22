# TerangaLink — SEO automatique : Guide d'implémentation

## Vue d'ensemble

Ce système génère automatiquement tout le SEO de chaque restaurant à partir des
données déjà présentes en base. **Aucune action requise côté restaurateur.**

---

## Fichiers à livrer

### Nouveaux fichiers à créer

| Chemin | Rôle |
|--------|------|
| `src/lib/seo.ts` | Utilitaires SEO partagés |
| `src/app/[slug]/opengraph-image.tsx` | OG Image dynamique (WhatsApp, Facebook…) |
| `src/app/[slug]/twitter-image.tsx` | Twitter Card image |
| `src/app/sitemap.ts` | Sitemap dynamique `/sitemap.xml` |
| `src/app/robots.ts` | robots.txt dynamique `/robots.txt` |

### Fichiers à remplacer intégralement

| Chemin | Modifications |
|--------|---------------|
| `src/app/[slug]/page.tsx` | `generateMetadata` enrichi + Schema.org injecté |
| `src/app/layout.tsx` | OG global + Twitter Card + robots global |
| `next.config.js` | Inchangé (déjà compatible) |

---

## Ordre d'implémentation recommandé

```
1. src/lib/seo.ts                          ← utilitaires (aucune dépendance)
2. src/app/layout.tsx                      ← OG global site
3. src/app/robots.ts                       ← robots.txt
4. src/app/sitemap.ts                      ← sitemap.xml
5. src/app/[slug]/page.tsx                 ← metadata + Schema.org
6. src/app/[slug]/opengraph-image.tsx      ← OG Image dynamique (Phase 2)
7. src/app/[slug]/twitter-image.tsx        ← Twitter Card (réexporte OG)
```

---

## Ce que chaque fichier apporte

### `src/lib/seo.ts`
- `buildAutoDescription()` — génère une description SEO intelligente si le
  restaurateur n'en a pas renseignée, en utilisant nom + ville + cuisine_type
  + items du menu. Ex : *"Dema Sweets — Commandez tiramisus, lasagnes à Dakar
  via WhatsApp sur TerangaLink."*
- `buildTitle()` — titre SEO formaté `Nom · Cuisine · Ville`
- `buildKeywords()` — mots-clés dédupliqués à partir de toutes les données
- `buildSchemaOrg()` — données structurées Google (Restaurant + LocalBusiness)
  avec horaires, GPS, réseaux sociaux, téléphone

### `src/app/[slug]/page.tsx`
- `generateMetadata` complet : `title`, `description`, `keywords`, `canonical`,
  `robots`, `openGraph`, `twitter`, géolocalisation meta
- `<Script type="application/ld+json">` avec Schema.org injecté dans le HTML

### `src/app/[slug]/opengraph-image.tsx`
Route Next.js `ImageResponse` (Edge Runtime) qui génère une image PNG 1200×630
à la volée pour chaque restaurant. Contient :
- Image de couverture du restaurant en fond
- Overlay sombre pour la lisibilité
- Logo du restaurant
- Nom du restaurant (grand, gras)
- Ville et type de cuisine
- CTA « Commander via WhatsApp »
- Badge TerangaLink en haut à droite

Fallbacks automatiques si données absentes (pas de logo, pas de cover…).

### `src/app/sitemap.ts`
Sitemap XML dynamique incluant page d'accueil, pages légales, et **tous les
restaurants actifs** avec leur date de mise à jour. Revalidé toutes les heures.

### `src/app/robots.ts`
robots.txt autorisant l'indexation publique et excluant les dashboards,
l'API et les pages protégées.

---

## Vérification post-déploiement

```bash
# robots.txt
curl https://teranga-link.com/robots.txt

# Sitemap
curl https://teranga-link.com/sitemap.xml

# OG Image d'un restaurant
curl -I https://teranga-link.com/dema-sweets/opengraph-image

# Tester les aperçus WhatsApp/Facebook
# → https://developers.facebook.com/tools/debug/
# → https://cards-dev.twitter.com/validator
# → https://www.linkedin.com/post-inspector/
```

---

## Données utilisées automatiquement

| Champ DB | Usage SEO |
|----------|-----------|
| `name` | title, OG title, Schema.org name |
| `description` | meta description (si renseignée) |
| `city` | title, keywords, meta geo, Schema.org address |
| `address` | Schema.org streetAddress |
| `cuisine_type` | title, keywords, description auto, Schema.org servesCuisine |
| `cover_url` | OG image fond, Schema.org image |
| `logo_url` | OG image logo, Schema.org logo |
| `phone` | Schema.org telephone |
| `whatsapp_number` | Schema.org telephone (prioritaire) + sameAs |
| `latitude` / `longitude` | Schema.org GeoCoordinates + meta ICBM |
| `opening_hours` | Schema.org openingHours |
| `facebook_url` | Schema.org sameAs |
| `instagram_url` | Schema.org sameAs |
| `tiktok_url` | Schema.org sameAs |
| `menu_items.name` | description auto + keywords |

---

## Notes importantes

- **Edge Runtime** : `opengraph-image.tsx` tourne sur l'edge Vercel. Pas de
  `fs`, pas de `node:` modules. Les imports Supabase doivent être compatibles
  edge. Si erreur, retirer `export const runtime = 'edge'` pour passer en Node.
- **Pas de refactoring** : seul `generateMetadata` et le JSX de retour de
  `page.tsx` sont modifiés. Toute la logique commandes/abonnements/thèmes est
  identique.
- **Performance** : la requête SEO dans `generateMetadata` est indépendante de
  celle du rendu — Next.js les exécute en parallèle automatiquement.
