import * as DialogPrimitive from '@radix-ui/react-dialog'

export interface TourCatalogModalProps {
  open:          boolean
  onClose:       () => void
  onSelectPhase: (phase: 1 | 2) => void
}

interface CatalogEntry {
  phase:    1 | 2
  title:    string
  body:     string
  duration: string
}

const ENTRIES: CatalogEntry[] = [
  {
    phase:    1,
    title:    'Setup inicial',
    body:     'Identidade da loja, frete, primeiro produto e onde os pedidos vão aparecer.',
    duration: '~10 minutos',
  },
  {
    phase:    2,
    title:    'Operação',
    body:     'Como acompanhar pedidos, produção, envios e clientes.',
    duration: '~5 minutos',
  },
]

/**
 * Modal that lists the available tours so the user can pick which one to
 * replay. Triggered by "Refazer tour" in the dashboard header dropdown.
 *
 * Picking an entry closes the catalog and calls `onSelectPhase(n)` — the
 * provider then resets the right state and re-launches that phase's entry
 * modal.
 */
export function TourCatalogModal({ open, onClose, onSelectPhase }: TourCatalogModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="tour-modal__overlay" data-testid="tour-catalog-overlay">
          <DialogPrimitive.Content className="tour-modal" data-testid="tour-catalog-modal">
            <DialogPrimitive.Title className="tour-modal__title">Refazer tour</DialogPrimitive.Title>
            <DialogPrimitive.Description asChild>
              <div className="tour-modal__body">
                <p>Escolha qual parte do tour você quer revisitar.</p>
              </div>
            </DialogPrimitive.Description>

            <div className="tour-catalog__list">
              {ENTRIES.map((entry) => (
                <button
                  key={entry.phase}
                  type="button"
                  className="tour-catalog__item"
                  onClick={() => onSelectPhase(entry.phase)}
                  data-testid={`tour-catalog-phase-${entry.phase}`}
                >
                  <span className="tour-catalog__item-title">{entry.title}</span>
                  <span className="tour-catalog__item-body">{entry.body}</span>
                  <span className="tour-catalog__item-duration">{entry.duration}</span>
                </button>
              ))}
            </div>

            <div className="tour-modal__actions">
              <button
                type="button"
                className="tour-button-secondary"
                onClick={onClose}
                data-testid="tour-catalog-cancel"
              >
                Cancelar
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
