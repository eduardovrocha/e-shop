export interface TourViewportGuardProps {
  onDismiss: () => void
}

/**
 * Full-screen message shown when the tour tries to run on a viewport below
 * 768px. Copy mirrors the visual spec section 12 verbatim.
 */
export function TourViewportGuard({ onDismiss }: TourViewportGuardProps) {
  return (
    <div className="tour-viewport-guard" data-testid="tour-viewport-guard">
      <div className="tour-viewport-guard__card">
        <h2 className="tour-modal__title" style={{ fontSize: 18 }}>
          O tour está disponível em telas maiores.
        </h2>
        <p className="tour-modal__body" style={{ fontSize: 14 }}>
          No celular, o dashboard é otimizado para consulta — o setup
          inicial fica melhor no desktop.
        </p>
        <div className="tour-modal__actions">
          <button
            type="button"
            className="tour-button-primary"
            onClick={onDismiss}
            data-testid="tour-viewport-guard-dismiss"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
