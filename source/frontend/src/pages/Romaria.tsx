// Romaria — landing page montada como home (/).
// Renderizada dentro do <MainLayout />, que já fornece <Header /> e <Footer />
// compartilhados com o resto do app.
import { Link } from 'react-router-dom'
import { ProductCard } from '@/components/ProductCard'
import { ProductCardSkeleton } from '@/components/LoadingSkeleton'
import { useProducts } from '@/hooks/useProducts'

const ROMARIA_IMAGE = '/images/romaria-carreiros.jpg'
const COLECAO_LIMIT = 3
const ROMARIA_IMAGE_ALT =
  'Romaria dos Carreiros — carros de boi em frente ao Santuário de Andrequicé'

/* ────────────────────────────────────────────────────────────────────────── */
/* Hero                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="relative min-h-[580px] md:min-h-[680px] overflow-hidden bg-andrequice-brown">
      {/* Imagem de fundo */}
      <img
        src={ROMARIA_IMAGE}
        alt={ROMARIA_IMAGE_ALT}
        className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
      />

      {/* Overlay principal — escurece para legibilidade do texto sobre a foto */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-andrequice-navy/85 via-andrequice-brown/65 to-andrequice-brown/45"
        aria-hidden
      />
      {/* Overlay base — reforça a leitura da legenda no rodapé */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-andrequice-navy/70 via-transparent to-transparent"
        aria-hidden
      />

      {/* Número fantasma */}
      <div
        className="absolute bottom-6 right-6 md:right-12 font-serif text-[8rem] md:text-[12rem] font-bold text-white/[0.07] leading-none select-none pointer-events-none z-0"
        aria-hidden
      >
        15
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 pt-20 md:pt-28 pb-36 md:pb-44 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <span className="block w-5 h-px bg-andrequice-gold/70" aria-hidden />
          <span className="text-[0.65rem] font-semibold tracking-[0.22em] uppercase text-andrequice-gold">
            Distrito de Presidente Olegário · Minas Gerais
          </span>
        </div>

        <h1 className="font-serif text-[clamp(2.4rem,4.5vw,3.6rem)] font-bold text-andrequice-cream leading-[1.1] tracking-[-0.02em]">
          Nossa história,
        </h1>
        <h1 className="font-serif text-[clamp(2.6rem,4.8vw,3.9rem)] font-normal text-andrequice-gold leading-[1.1] tracking-[-0.02em]">
          nossa devoção.
        </h1>

        <div className="my-6 text-andrequice-gold max-w-[80px]" aria-hidden>
          ✦
        </div>

        <p className="text-[0.95rem] text-andrequice-cream/85 leading-[1.7] max-w-[440px] mb-8">
          A Romaria de Nossa Senhora da Abadia — uma peregrinação de fé que atravessa séculos,
          famílias e gerações no coração de Minas Gerais.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#colecao"
            className="inline-flex items-center gap-2 bg-andrequice-navy text-andrequice-cream text-[0.88rem] font-medium px-7 py-[0.9rem] rounded-full shadow-md hover:bg-andrequice-azure transition-colors w-fit"
          >
            Ver Coleção ✦
          </a>
          <a
            href="#historia"
            className="inline-flex items-center gap-2 border border-andrequice-cream/40 text-andrequice-cream text-[0.88rem] font-medium px-7 py-[0.9rem] rounded-full hover:bg-andrequice-cream/10 transition-colors w-fit"
          >
            Conheça a festa ✦
          </a>
        </div>
      </div>

      {/* Legenda no rodapé — preservada do layout anterior */}
      <div className="absolute bottom-0 left-0 right-0 px-6 md:px-12 pb-6 pt-12 bg-gradient-to-t from-andrequice-navy/[0.82] to-transparent z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-[0.6rem] font-semibold tracking-[0.25em] uppercase text-andrequice-gold mb-1">
            Romaria dos Carreiros
          </div>
          <div className="font-serif text-[1.05rem] font-semibold text-andrequice-cream leading-snug">
            A chegada dos carros de boi ao Santuário
          </div>
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Ornamento divisor reutilizável                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function OrnamentDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden>
      <span className="block h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent to-andrequice-gold/60" />
      <span className="text-andrequice-gold text-sm">✦</span>
      <span className="block h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent to-andrequice-gold/60" />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Nossa Coleção — lista de produtos                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function NossaColecao() {
  const { products, isLoading, error } = useProducts()
  const visible = products.slice(0, COLECAO_LIMIT)

  return (
    <section id="colecao" className="px-6 md:px-12 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-0 gap-4 flex-wrap">
          <div>
            <div className="text-[0.65rem] font-semibold tracking-[0.22em] uppercase text-andrequice-brown/50 mb-2">
              A loja
            </div>
            <h2 className="font-serif text-[1.75rem] font-semibold text-andrequice-navy">
              Nossa Coleção
            </h2>
          </div>
          <Link
            to="/catalog"
            className="text-[0.82rem] font-medium text-andrequice-navy border border-andrequice-border rounded-full px-4 py-2 hover:bg-andrequice-sand transition-colors"
          >
            Acessar a Loja ✦
          </Link>
        </div>

        <OrnamentDivider className="my-5" />

        {error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="font-sans text-sm text-andrequice-brown/70">{error}</p>
            <Link to="/catalog" className="text-xs text-andrequice-gold underline">
              Ir para o catálogo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: COLECAO_LIMIT }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))
              : visible.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
          </div>
        )}

        {!isLoading && !error && visible.length === 0 && (
          <p className="text-center text-[0.88rem] text-andrequice-brown/60 py-10">
            Nenhuma peça disponível no momento.
          </p>
        )}
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Nossa História                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function HistoriaSection() {
  return (
    <section id="historia" className="bg-andrequice-cream px-6 md:px-12 py-16">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Texto */}
        <div className="flex flex-col gap-4 max-w-prose">
          <h3 className="font-serif text-[1.6rem] font-semibold text-andrequice-navy">
            A nossa história
          </h3>

          <OrnamentDivider className="self-start w-full max-w-[200px]" />

          <p className="text-[0.9rem] text-andrequice-brown/75 leading-[1.7]">
            A Andrequicé nasceu da devoção à Nossa Senhora da Abadia, do amor pela nossa terra e
            pela nossa gente — uma fé que passa de geração em geração desde o final do século XIX.
          </p>
          <p className="text-[0.9rem] text-andrequice-brown/75 leading-[1.7]">
            Cada tradição da festa carrega um pouco dessa história, para que você leve a devoção
            sempre com você.
          </p>

          <a
            href="#tradicoes-navy"
            className="border border-andrequice-border text-andrequice-brown text-[0.82rem] font-medium rounded-full px-5 py-2.5 hover:bg-andrequice-sand transition-colors w-fit mt-2"
          >
            Conheça as tradições ✦
          </a>
        </div>

        {/* Visual */}
        <div className="relative rounded-2xl overflow-hidden min-h-[340px]">
          <img
            src={ROMARIA_IMAGE}
            alt={ROMARIA_IMAGE_ALT}
            className="absolute inset-0 w-full h-full object-cover object-[center_25%]"
          />
          <div
            className="absolute inset-0 bg-gradient-to-br from-andrequice-gold/[0.18] to-transparent mix-blend-multiply"
            aria-hidden
          />
          <div className="absolute bottom-0 left-0 right-0 px-6 py-5 bg-gradient-to-t from-andrequice-navy/75 to-transparent rounded-b-2xl">
            <div className="text-[0.68rem] font-semibold tracking-[0.18em] uppercase text-andrequice-gold">
              Andrequicé · Minas Gerais
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Tradições (fundo navy)                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

const TRADICOES_NAVY = [
  { n: '01', name: 'Novena e missas', desc: 'Dias de celebração no santuário, do início ao fim da quinzena' },
  { n: '02', name: 'Procissões', desc: 'Cortejo de fiéis pelas ruas em louvor à Nossa Senhora da Abadia' },
  { n: '03', name: 'Pagamento de promessas', desc: 'Graças alcançadas cumpridas diante do santuário' },
  { n: '04', name: 'Peregrinação a pé', desc: 'Grupos que caminham dias inteiros para chegar a Andrequicé' },
  { n: '05', name: 'Cavalgada', desc: 'Cavaleiros em tropel da região chegando ao santuário' },
  { n: '06', name: 'Romaria dos carreiros', desc: 'A chegada dos carros de boi — a imagem mais simbólica da festa' },
]

function TradicoesNavySection() {
  return (
    <section id="tradicoes-navy" className="bg-andrequice-navy px-6 md:px-12 py-20">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-serif text-[1.75rem] font-semibold text-andrequice-cream mb-2">
          Tradições que resistem ao tempo
        </h2>
        <p className="text-[0.88rem] text-andrequice-cream/60 mb-8">
          Mesmo com as mudanças modernas, a festa preserva marcas muito antigas
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {TRADICOES_NAVY.map((t, idx) => {
            const highlight = idx === TRADICOES_NAVY.length - 1
            return (
              <article
                key={t.n}
                className={[
                  'rounded-2xl p-6 transition-colors border',
                  highlight
                    ? 'bg-andrequice-gold/[0.07] border-andrequice-gold/30 hover:bg-andrequice-gold/10'
                    : 'bg-white/[0.05] border-white/10 hover:bg-white/[0.08]',
                ].join(' ')}
              >
                <div className="text-[0.68rem] font-semibold tracking-[0.2em] text-andrequice-gold/60 mb-2">
                  {t.n}
                </div>
                <h3 className="font-serif text-[1rem] font-semibold text-andrequice-cream mb-2">
                  {t.name}
                </h3>
                <p className="text-[0.82rem] text-andrequice-cream/60 leading-relaxed">{t.desc}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Romeiros                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const ROMEIROS_CIDADES: Array<{ label: string; bold?: boolean }> = [
  { label: 'Presidente Olegário' },
  { label: 'João Pinheiro' },
  { label: 'São Gonçalo do Abaeté' },
  { label: 'Varjão de Minas' },
  { label: 'Patos de Minas' },
  { label: 'Goiás — devotos de todo o estado', bold: true },
  { label: 'Distrito Federal', bold: true },
]

function RomeirosSection() {
  return (
    <section className="px-6 md:px-12 py-16">
      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Texto */}
        <div>
          <blockquote className="border-l-2 border-andrequice-gold pl-5 font-serif text-[1.05rem] text-andrequice-navy leading-relaxed mb-5">
            "A Romaria de Andrequicé é considerada 'festa irmã' do Santuário de Nossa Senhora da
            Abadia de Romaria — ambas nasceram da mesma devoção."
          </blockquote>
          <p className="text-[0.88rem] text-andrequice-brown/70 leading-relaxed">
            Romeiros chegam de toda a microrregião do Alto Paranaíba — e de bem mais longe. Cidades
            de Minas convivem na fila das promessas com devotos vindos de Goiás e do Distrito
            Federal.
          </p>
        </div>

        {/* Lista */}
        <ul className="list-none">
          {ROMEIROS_CIDADES.map((c) => (
            <li
              key={c.label}
              className={[
                'flex items-center gap-3 py-2 border-b border-andrequice-sand text-[0.88rem] text-andrequice-brown',
                c.bold ? 'font-semibold' : '',
              ].join(' ')}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-andrequice-gold flex-shrink-0"
                aria-hidden
              />
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Trust Bar                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

const TRUST_ITEMS = [
  { icon: '🗓️', label: 'Primeira quinzena', sub: 'de agosto, todo ano' },
  { icon: '📍', label: 'Andrequicé', sub: 'Distrito de Presidente Olegário' },
  { icon: '🤝', label: 'Tradição secular', sub: 'Desde o século XIX' },
  { icon: '💬', label: 'Fale conosco', sub: 'Atendimento via WhatsApp' },
]

function TrustBar() {
  return (
    <section className="bg-andrequice-sand/40 border-y border-andrequice-sand">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center text-center gap-1 py-6 px-4"
          >
            <span className="text-2xl" aria-hidden>
              {item.icon}
            </span>
            <div className="text-[0.82rem] font-semibold text-andrequice-navy">{item.label}</div>
            <div className="text-[0.72rem] text-andrequice-brown/60">{item.sub}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Page                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export default function RomariaPage() {
  return (
    <>
      <HeroSection />
      <NossaColecao />
      <HistoriaSection />
      <TradicoesNavySection />
      <RomeirosSection />
      <TrustBar />
    </>
  )
}
