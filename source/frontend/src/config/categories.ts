export interface CategoryMeta {
  slug: string
  label: string
  description: string
  iconBg: string
  icon: (active: boolean) => string // returns SVG path d=""
}

export const CATEGORIES: CategoryMeta[] = [
  {
    slug: 'camisetas',
    label: 'Camisetas',
    description: 'Peças exclusivas bordadas à mão',
    iconBg: 'bg-andrequice-cream',
    icon: () =>
      'M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z',
  },
  {
    slug: 'acessorios',
    label: 'Acessórios',
    description: 'Complementos para o seu estilo',
    iconBg: 'bg-andrequice-sand/40',
    icon: () =>
      'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z',
  },
  {
    slug: 'kits',
    label: 'Kits',
    description: 'Combinações pensadas com carinho',
    iconBg: 'bg-andrequice-gold/10',
    icon: () =>
      'M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  },
  {
    slug: 'outros',
    label: 'Outros',
    description: 'Peças especiais da coleção',
    iconBg: 'bg-andrequice-azure/10',
    icon: () =>
      'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]))
