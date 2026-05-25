import type { VariantGender, VariantCut } from '@/types/product'
import { VARIANT_GENDER_LABEL, VARIANT_CUT_LABEL } from '@/types/product'

// Builds the "Gênero · Corte · Tamanho M" descriptor preface used in every
// admin surface that lists order items / inventory rows. Hides the default
// values (unissex / normal) so legacy products and unissex SKUs keep the
// original short "Tamanho M" look. Returns "" when no piece survives the
// filter — caller can branch on the empty string to drop the whole element.
//
// Mirrors the storefront helper in frontend/src/utils/variant.ts. Kept as a
// separate copy on purpose: the two apps don't share a package, and the
// label format differs (admin uses full "Tamanho", storefront uses "Tam.").
export function formatVariantDescriptors(opts: {
  gender?: VariantGender | null
  cut?:    VariantCut    | null
  size?:   string | null
  // Ordering tweak for the cancellation modal which puts size LAST after
  // gender/cut. Default order is size-first (matches the order item card).
  sizeFirst?: boolean
}): string {
  const parts: string[] = []

  const sizeChunk   = opts.size ? `Tamanho ${opts.size}` : null
  const genderChunk = opts.gender && opts.gender !== 'unissex' ? VARIANT_GENDER_LABEL[opts.gender] : null
  const cutChunk    = opts.cut    && opts.cut    !== 'normal'  ? VARIANT_CUT_LABEL[opts.cut]      : null

  if (opts.sizeFirst === false) {
    if (genderChunk) parts.push(genderChunk)
    if (cutChunk)    parts.push(cutChunk)
    if (sizeChunk)   parts.push(sizeChunk)
  } else {
    if (sizeChunk)   parts.push(sizeChunk)
    if (genderChunk) parts.push(genderChunk)
    if (cutChunk)    parts.push(cutChunk)
  }

  return parts.join(' · ')
}
