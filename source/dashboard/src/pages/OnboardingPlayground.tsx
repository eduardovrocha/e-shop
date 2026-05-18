import { useState } from 'react'
import { TourTooltip, type TourTooltipPosition } from '@/components/onboarding/TourTooltip'
import { TourModal } from '@/components/onboarding/TourModal'
import { TourHighlight } from '@/components/onboarding/TourHighlight'

const POSITIONS: TourTooltipPosition[] = ['top', 'bottom', 'left', 'right']

export default function OnboardingPlayground() {
  const [welcomeOpen,    setWelcomeOpen]    = useState(false)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [reducedMotion,  setReducedMotion]  = useState(false)
  const [forceDark,      setForceDark]      = useState(false)

  return (
    <div
      className={forceDark ? 'tour-playground tour-playground--dark' : 'tour-playground'}
      style={{
        minHeight: '100vh',
        padding: '32px',
        background: forceDark ? '#0F172A' : '#F9FAFB',
        color: forceDark ? '#F9FAFB' : '#111827',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
    >
      <style>
        {reducedMotion ? `
          .tour-tooltip, .tour-modal, .tour-modal__overlay,
          .tour-highlight, .tour-tooltip__progress-dot {
            animation: none !important;
            transition: opacity 50ms linear !important;
          }
        ` : ''}
        {forceDark ? `
          .tour-playground--dark {
            --tour-bg: #1F2937;
            --tour-bg-modal: #1F2937;
            --tour-border: #374151;
            --tour-text-primary: #F9FAFB;
            --tour-text-secondary: #D1D5DB;
            --tour-text-tertiary: #9CA3AF;
            --tour-accent: #818CF8;
            --tour-accent-hover: #A5B4FC;
            --tour-accent-soft: rgba(129, 140, 248, 0.12);
            --tour-overlay: rgba(0, 0, 0, 0.6);
          }
        ` : ''}
      </style>

      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px' }}>
          Onboarding tour — playground
        </h1>
        <p style={{ fontSize: 14, color: forceDark ? '#D1D5DB' : '#4B5563', margin: 0 }}>
          Rota interna de desenvolvimento. Valida visualmente os componentes
          isolados antes da integração com o React Joyride.
        </p>
      </header>

      <section style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={forceDark}
              onChange={(e) => setForceDark(e.target.checked)}
              data-testid="playground-toggle-dark"
            />
            Forçar modo escuro
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              data-testid="playground-toggle-reduced-motion"
            />
            Simular reduced-motion
          </label>
          <button
            type="button"
            className="tour-button-primary"
            onClick={() => setWelcomeOpen(true)}
            data-testid="playground-open-welcome"
          >
            Abrir modal de boas-vindas
          </button>
          <button
            type="button"
            className="tour-button-secondary"
            onClick={() => setCompletionOpen(true)}
            data-testid="playground-open-completion"
          >
            Abrir modal de conclusão
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px' }}>
          Highlight em elemento exemplo
        </h2>
        <TourHighlight active>
          <button
            type="button"
            style={{
              padding: '10px 16px',
              background: forceDark ? '#1F2937' : '#FFFFFF',
              color: forceDark ? '#F9FAFB' : '#111827',
              border: `1px solid ${forceDark ? '#374151' : '#E5E7EB'}`,
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Botão destacado (pulse contínuo)
          </button>
        </TourHighlight>
      </section>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 16px' }}>
          Tooltip nas 4 posições
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 48,
          }}
        >
          {POSITIONS.map((position, idx) => (
            <div
              key={position}
              style={{
                position: 'relative',
                minHeight: 320,
                border: `1px dashed ${forceDark ? '#374151' : '#E5E7EB'}`,
                borderRadius: 12,
                padding: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: forceDark ? '#9CA3AF' : '#6B7280',
                  position: 'absolute',
                  top: 8,
                  left: 12,
                }}
              >
                position="{position}"
              </div>
              <TourTooltip
                title="Comece pelo nome."
                body="É o que aparece para o cliente no checkout, no e-mail de confirmação e na nota fiscal. Pode mudar depois."
                stepIndex={idx}
                totalSteps={4}
                phase={1}
                position={position}
                isFirstStep={idx === 0}
                isLastStep={idx === 3}
                onPrev={() => {}}
                onNext={() => {}}
                onSkip={() => {}}
                autoFocus={false}
              />
            </div>
          ))}
        </div>
      </section>

      <TourModal
        open={welcomeOpen}
        title="Bem-vindo à sua loja."
        body={
          <>
            <p>
              Em uns 10 minutos a gente passa pelas áreas principais e você sai
              daqui com a loja pronta para a primeira venda.
            </p>
            <p>
              Você pode pular qualquer passo e voltar depois — o progresso fica
              salvo.
            </p>
          </>
        }
        primaryAction={{
          label: 'Começar tour →',
          onClick: () => setWelcomeOpen(false),
        }}
        secondaryAction={{
          label: 'Pular por agora',
          onClick: () => setWelcomeOpen(false),
        }}
        onDismiss={() => setWelcomeOpen(false)}
      />

      <TourModal
        open={completionOpen}
        title="Loja pronta."
        body={
          <>
            <p>
              Você configurou o essencial. Quando a primeira venda chegar, a
              gente volta para te mostrar como acompanhar pedidos, produção e
              clientes.
            </p>
            <p>
              Enquanto isso, explore o dashboard à vontade — o menu de ajuda
              no canto superior tem o tour completo se quiser refazer alguma
              parte.
            </p>
          </>
        }
        primaryAction={{
          label: 'Fechar',
          onClick: () => setCompletionOpen(false),
        }}
        onDismiss={() => setCompletionOpen(false)}
      />
    </div>
  )
}
