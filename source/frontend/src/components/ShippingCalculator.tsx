import { useState } from 'react'
import api from '@/services/api'

interface ShippingOption {
  provider: string
  service_id: number
  carrier: string
  service: string
  price_cents: number
  delivery_days: number
  currency: string
}

interface Props {
  items: Array<{ productId: number; quantity: number }>
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ShippingCalculator({ items }: Props) {
  const [zipcode, setZipcode] = useState('')
  const [options, setOptions] = useState<ShippingOption[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cheapest = options?.length
    ? options.reduce((a, b) => (a.price_cents <= b.price_cents ? a : b))
    : null

  const fastest = options?.filter((o) => o.delivery_days > 0).length
    ? options
        .filter((o) => o.delivery_days > 0)
        .reduce((a, b) => (a.delivery_days <= b.delivery_days ? a : b))
    : null

  function handleZipcodeChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    setZipcode(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits)
  }

  async function handleCalculate() {
    const clean = zipcode.replace(/\D/g, '')
    if (clean.length !== 8) {
      setError('CEP inválido. Informe os 8 dígitos.')
      return
    }
    if (!items.length) {
      setError('Nenhum produto selecionado.')
      return
    }

    setLoading(true)
    setError(null)
    setOptions(null)

    try {
      const { data } = await api.post<ShippingOption[]>('/shipping/calculate', {
        zipcode: clean,
        items,
      })
      setOptions(data)
    } catch {
      setError('Não foi possível calcular o frete. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="00000-000"
          maxLength={9}
          value={zipcode}
          onChange={(e) => handleZipcodeChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          type="button"
          onClick={handleCalculate}
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {loading ? 'Calculando...' : 'Calcular'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {options !== null && options.length === 0 && (
        <p className="text-sm text-gray-500">
          Nenhuma opção de frete disponível para este CEP.
        </p>
      )}

      {options && options.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {options.map((opt) => {
            const isCheapest = cheapest?.service_id === opt.service_id && opt.price_cents > 0
            const isFastest =
              fastest?.service_id === opt.service_id &&
              fastest?.service_id !== cheapest?.service_id

            return (
              <li
                key={`${opt.provider}-${opt.service_id}`}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {opt.carrier} — {opt.service}
                  </p>
                  <p className="text-xs text-gray-500">
                    {opt.delivery_days === 0
                      ? 'Retirada'
                      : `${opt.delivery_days} dia${opt.delivery_days !== 1 ? 's' : ''} útei${opt.delivery_days !== 1 ? 's' : 'l'}`}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-gray-900">
                    {opt.price_cents === 0 ? 'Grátis' : formatCents(opt.price_cents)}
                  </span>
                  <div className="flex gap-1">
                    {isCheapest && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                        Menor preço
                      </span>
                    )}
                    {isFastest && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                        Mais rápido
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
