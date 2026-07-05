/**
 * Alias manuels pour fusionner des tokens de spécialité que la correspondance
 * par sous-chaîne (isLooseMatch) ne peut pas rapprocher automatiquement.
 * Vide par défaut — les tokens inconnus ne sont jamais filtrés, seulement
 * éventuellement redirigés vers un token canonique déjà connu.
 */
export const SPECIALTY_SYNONYMS: Record<string, string> = {}
