import * as DialogPrimitive from '@radix-ui/react-dialog'
import { type ReactNode } from 'react'

export interface TourModalAction {
  label: string
  onClick: () => void
  /**
   * Defaults to `false` for the secondaryAction.
   * Disables the button while keeping it visible.
   */
  disabled?: boolean
}

export interface TourModalProps {
  open: boolean
  title: string
  body: ReactNode
  primaryAction: TourModalAction
  secondaryAction?: TourModalAction
  /**
   * Called when the user dismisses via Esc or overlay click. The host can
   * use this to confirm "are you sure?" before actually closing.
   * If omitted, the modal is non-dismissable except via the action buttons.
   */
  onDismiss?: () => void
}

export function TourModal({
  open,
  title,
  body,
  primaryAction,
  secondaryAction,
  onDismiss,
}: TourModalProps) {
  function handleOpenChange(next: boolean) {
    if (!next) onDismiss?.()
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="tour-modal__overlay"
          data-testid="tour-modal-overlay"
        >
          <DialogPrimitive.Content
            className="tour-modal"
            data-testid="tour-modal"
            onPointerDownOutside={(e) => {
              if (!onDismiss) e.preventDefault()
            }}
            onEscapeKeyDown={(e) => {
              if (!onDismiss) e.preventDefault()
            }}
          >
            <DialogPrimitive.Title className="tour-modal__title">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description asChild>
              <div className="tour-modal__body">{body}</div>
            </DialogPrimitive.Description>

            <div className="tour-modal__actions">
              {secondaryAction && (
                <button
                  type="button"
                  className="tour-button-secondary"
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                  data-testid="tour-modal-secondary"
                >
                  {secondaryAction.label}
                </button>
              )}
              <button
                type="button"
                className="tour-button-primary"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                autoFocus
                data-testid="tour-modal-primary"
              >
                {primaryAction.label}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
