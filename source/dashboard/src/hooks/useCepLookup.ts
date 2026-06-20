import { useCallback, useState } from 'react'

// Endereço normalizado usado pelo formulário de pedido manual. Espelha o
// shape esperado pelo backend (cep, address, city, state, neighborhood).
export interface CepAddress {
  cep: string
  address: string
  neighborhood: string
  city: string
  state: string
}

const EMPTY_ADDRESS: CepAddress = {
  cep: '',
  address: '',
  neighborhood: '',
  city: '',
  state: '',
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  return digits
}

// Consulta o ViaCEP e mantém o endereço. CEPs de cidade única (ex.: 38750-000)
// retornam logradouro/bairro vazios — liberamos os respectivos campos para
// edição manual (mesmo comportamento do checkout do site).
export function useCepLookup() {
  const [address, setAddress] = useState<CepAddress>(EMPTY_ADDRESS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStreetEmptyFromCep, setIsStreetEmptyFromCep] = useState(false)
  const [isNeighborhoodEmptyFromCep, setIsNeighborhoodEmptyFromCep] = useState(false)

  const setField = useCallback((field: keyof CepAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: field === 'cep' ? formatCep(value) : value }))
    if (field === 'cep') {
      setIsStreetEmptyFromCep(false)
      setIsNeighborhoodEmptyFromCep(false)
      setError(null)
    }
  }, [])

  const lookup = useCallback(async () => {
    const clean = address.cep.replace(/\D/g, '')
    if (clean.length !== 8) {
      setError('CEP inválido. Informe os 8 dígitos.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const viaCep = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
        .then((r) => r.json())
        .catch(() => null)

      if (viaCep && !viaCep.erro) {
        const logradouro = (viaCep.logradouro ?? '').toString()
        const bairro = (viaCep.bairro ?? '').toString()
        setAddress((prev) => ({
          ...prev,
          address: logradouro,
          neighborhood: bairro,
          city: viaCep.localidade ?? '',
          state: viaCep.uf ?? '',
        }))
        setIsStreetEmptyFromCep(logradouro.trim().length === 0)
        setIsNeighborhoodEmptyFromCep(bairro.trim().length === 0)
      } else {
        setError('CEP não encontrado. Preencha o endereço manualmente.')
        setIsStreetEmptyFromCep(true)
        setIsNeighborhoodEmptyFromCep(true)
      }
    } catch {
      setError('Não foi possível consultar o CEP. Preencha manualmente.')
      setIsStreetEmptyFromCep(true)
      setIsNeighborhoodEmptyFromCep(true)
    } finally {
      setLoading(false)
    }
  }, [address.cep])

  const reset = useCallback(() => {
    setAddress(EMPTY_ADDRESS)
    setError(null)
    setIsStreetEmptyFromCep(false)
    setIsNeighborhoodEmptyFromCep(false)
  }, [])

  return {
    address,
    loading,
    error,
    isStreetEmptyFromCep,
    isNeighborhoodEmptyFromCep,
    setField,
    lookup,
    reset,
  }
}
