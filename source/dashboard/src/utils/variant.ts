import type { VariantGender, VariantCut } from '@/types/product'
import { VARIANT_GENDER_LABEL, VARIANT_CUT_LABEL } from '@/types/product'

// Builds the "Gênero · Corte · Tamanho M" descriptor preface used in every
// admin surface that lists order items / inventory rows. Always shows every
// dimension the backend exposed (including the defaults Unissex / Normal)
// so the operator has full visibility of what was sold. Returns "" only
// when the underlying data is genuinely missing.
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
  const sizeChunk   = opts.size   ? `Tamanho ${opts.size}`        : null
  const genderChunk = opts.gender ? VARIANT_GENDER_LABEL[opts.gender] : null
  const cutChunk    = opts.cut    ? VARIANT_CUT_LABEL[opts.cut]      : null

  const parts: (string | null)[] = opts.sizeFirst === false
    ? [genderChunk, cutChunk, sizeChunk]
    : [sizeChunk, genderChunk, cutChunk]

  return parts.filter(Boolean).join(' · ')
}
