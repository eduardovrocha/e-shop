import { Link } from 'react-router-dom'
import { useStoreSettings } from '@/hooks/useStoreSettings'

export function Footer() {
  const settings = useStoreSettings()

  return (
    <footer className="bg-andrequice-navy text-white/70">
      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">
        {/* Brand */}
        <div className="flex flex-col gap-2">
          <span className="font-serif text-xl font-semibold text-white">Andrequicé</span>
          <p className="text-sm leading-relaxed max-w-xs">
            {settings.footer_description}
          </p>
        </div>

        {/* Links */}
        <div className="flex gap-8 text-sm">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/40">Loja</span>
            <Link to="/catalog" className="hover:text-white transition-colors">Catálogo</Link>
            <Link to="/cart" className="hover:text-white transition-colors">Carrinho</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/40">Contato</span>
            <a href="https://wa.me/553800000000" className="hover:text-white transition-colors">WhatsApp</a>
            <a href="mailto:contato@andrequice.com.br" className="hover:text-white transition-colors">E-mail</a>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-6 flex flex-col gap-1">
          <p className="text-xs">© {new Date().getFullYear()} Andrequicé. Todos os direitos reservados.</p>
          <p className="text-xs text-white/40">Pagamentos processados com segurança via Stripe.</p>
        </div>
      </div>
    </footer>
  )
}
