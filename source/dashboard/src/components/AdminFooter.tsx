export function AdminFooter() {
  const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.1.0'
  const buildDate  = import.meta.env.VITE_BUILD_DATE  ?? ''
  const buildLabel = buildDate ? `v.${appVersion}, ${buildDate}` : `v.${appVersion}`

  return (
    <footer className="bg-brand-navy text-white/70">
      <div className="px-6 py-8 flex flex-col gap-6">
        {/* Brand */}
        <div className="flex flex-col gap-1">
          <span className="font-serif text-lg font-semibold text-white">Andrequicé</span>
          <span className="text-xs text-white/40 uppercase tracking-widest">Painel Administrativo</span>
        </div>

        {/* Links */}
        <div className="flex gap-8 text-sm">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-white/40">Sistema</span>
            <a
              href="https://andrequice.store"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Ver Loja
            </a>
            <a
              href="https://api.andrequice.store/api/v1/health"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Status da API
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-5 flex flex-col gap-1">
          <p className="text-xs">© {new Date().getFullYear()} Andrequicé. Todos os direitos reservados.</p>
          <p className="text-xs text-white/40">
            Desenvolvido por{' '}
            <a
              href="https://ioit.solutions"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              ioit.solutions
            </a>
            {' '}{buildLabel}
          </p>
        </div>
      </div>
    </footer>
  )
}
