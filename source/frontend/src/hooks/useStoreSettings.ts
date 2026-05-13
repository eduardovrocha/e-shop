import { useState, useEffect } from 'react'
import { storeService } from '@/services/storeService'

const DEFAULTS = {
  headline_primary:     'Nossa história,',
  headline_secondary:   'nossa devoção.',
  headline_description: 'Camisetas artesanais da Festa de Andrequicé. Arte, fé e tradição em cada peça.',
  footer_description:   'Camisetas artesanais da Festa de Andrequicé — fé, tradição e arte do interior de Minas Gerais.',
}

export function useStoreSettings() {
  const [settings, setSettings] = useState(DEFAULTS)

  useEffect(() => {
    let cancelled = false
    storeService
      .getHeadline()
      .then((data) => { if (!cancelled) setSettings(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return settings
}
