import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center gap-8">
        {/* Decorative top ornament */}
        <div className="flex items-center gap-3">
          <div className="h-px w-16 bg-andrequice-gold/50" />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-andrequice-gold/80">
            <path d="M12 2l2.09 6.26L20 9.27l-5 4.87 1.18 6.88L12 17.77l-4.18 3.25L9 14.14 4 9.27l5.91-.91L12 2z" fill="currentColor" />
          </svg>
          <div className="h-px w-16 bg-andrequice-gold/50" />
        </div>

        <div className="flex flex-col gap-4 max-w-sm">
          <h1 className="font-serif text-5xl font-semibold text-andrequice-navy tracking-display leading-tight">
            Andrequicé
          </h1>
          <p className="font-serif text-lg text-andrequice-brown/80 leading-relaxed">
            "Nossa história, nossa devoção."
          </p>
          <p className="font-sans text-sm text-andrequice-brown/70 leading-relaxed">
            Camisetas artesanais da Festa de Andrequicé — fé, tradição e arte do interior de Minas Gerais.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/catalog')}>
            Ver Coleção
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={() => navigate('/catalog')}>
            Conheça a festa
          </Button>
        </div>

      </section>

      {/* Values strip */}
      <section className="bg-white border-t border-andrequice-sand px-6 py-10">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { icon: '✦', label: 'Artesanal' },
            { icon: '✦', label: 'Tradição' },
            { icon: '✦', label: 'Devoção' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-2">
              <span className="text-andrequice-gold text-lg">{item.icon}</span>
              <span className="font-serif text-sm text-andrequice-navy">{item.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
