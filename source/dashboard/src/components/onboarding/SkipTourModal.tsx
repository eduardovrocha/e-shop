import * as DialogPrimitive from '@radix-ui/react-dialog'

export interface SkipTourModalProps {
  open: boolean
  onSkipNow:          () => void
  onSkipPermanently:  () => void
  onContinue:         () => void
}

/**
 * Confirmation modal shown when the user clicks "Pular tour" from inside
 * a tooltip or the welcome / completion modals. Three options, matching
 * the spec section 7.
 */
export function SkipTourModal({
  open,
  onSkipNow,
  onSkipPermanently,
  onContinue,
}: SkipTourModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onContinue() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="tour-modal__overlay" data-testid="skip-tour-overlay">
          <DialogPrimitive.Content className="tour-modal" data-testid="skip-tour-modal">
            <DialogPrimitive.Title className="tour-modal__title">
              Pular o tour?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description asChild>
              <div className="tour-modal__body">
                <p>Você pode retomar a qualquer momento pelo menu de ajuda.</p>
              </div>
            </DialogPrimitive.Description>

            <div className="tour-modal__actions" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="tour-link-skip"
                onClick={onSkipPermanently}
                data-testid="skip-tour-permanent"
              >
                Não mostrar mais
              </button>
              <button
                type="button"
                className="tour-button-secondary"
                onClick={onSkipNow}
                data-testid="skip-tour-now"
              >
                Pular agora
              </button>
              <button
                type="button"
                className="tour-button-primary"
                onClick={onContinue}
                autoFocus
                data-testid="skip-tour-continue"
              >
                Continuar tour
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
