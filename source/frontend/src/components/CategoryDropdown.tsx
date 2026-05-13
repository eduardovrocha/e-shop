import { useRef, useEffect, useCallback, useState } from 'react'
import type { CategoryMeta } from '@/config/categories'

interface Props {
  categories: CategoryMeta[]
  selected: string | null
  onChange: (slug: string | null) => void
  counts?: Record<string, number>
  totalCount?: number
}

function CategoryIcon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="transition-transform duration-200"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function CategoryDropdown({ categories, selected, onChange, counts = {}, totalCount }: Props) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState<number>(-1)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)
  const itemRefs   = useRef<(HTMLButtonElement | null)[]>([])

  // "All" item + each category
  const allItems = [null, ...categories.map((c) => c.slug)]

  const close = useCallback(() => {
    setOpen(false)
    setFocused(-1)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !panelRef.current?.contains(e.target as Node)
      ) {
        close()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, close])

  // Close on Esc
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  // Focus item when focused index changes
  useEffect(() => {
    if (focused >= 0) itemRefs.current[focused]?.focus()
  }, [focused])

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(true)
      setFocused(0)
    }
  }

  function handleItemKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocused(Math.min(idx + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (idx === 0) {
        close()
        triggerRef.current?.focus()
      } else {
        setFocused(idx - 1)
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onChange(allItems[idx])
      close()
      triggerRef.current?.focus()
    }
  }

  function selectItem(slug: string | null) {
    onChange(slug)
    close()
  }

  const selectedMeta = categories.find((c) => c.slug === selected)

  return (
    <div className="relative inline-block">
      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v)
          setFocused(-1)
        }}
        onKeyDown={handleTriggerKeyDown}
        className="flex items-center gap-2 rounded-2xl border border-andrequice-sand bg-white px-3.5 py-2 text-sm font-medium text-andrequice-navy shadow-soft transition-colors hover:border-andrequice-gold hover:bg-andrequice-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-andrequice-gold"
      >
        {/* Trigger icon: shows selected category icon or default grid */}
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-lg ${selectedMeta ? selectedMeta.iconBg : 'bg-andrequice-cream'} text-andrequice-navy`}
        >
          <CategoryIcon
            d={
              selectedMeta
                ? selectedMeta.icon(true)
                : 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'
            }
            size={14}
          />
        </span>

        <span>{selectedMeta ? selectedMeta.label : 'Categorias'}</span>
        <ChevronIcon open={open} />
      </button>

      {/* ── Panel ── */}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Filtrar por categoria"
          className="absolute left-0 top-full z-50 mt-2 w-64 origin-top-left animate-dropdown overflow-hidden rounded-2xl border border-andrequice-sand bg-white shadow-card"
        >
          {/* "All" item */}
          <button
            ref={(el) => { itemRefs.current[0] = el }}
            role="menuitem"
            type="button"
            tabIndex={focused === 0 ? 0 : -1}
            onKeyDown={(e) => handleItemKeyDown(e, 0)}
            onClick={() => selectItem(null)}
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-andrequice-cream focus-visible:bg-andrequice-cream focus-visible:outline-none ${selected === null ? 'bg-andrequice-cream/60' : ''}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-andrequice-navy/5 text-andrequice-navy">
              <CategoryIcon d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" size={15} />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-andrequice-navy leading-snug">
                Todas as peças
              </span>
              {totalCount !== undefined && (
                <span className="text-xs text-andrequice-brown/60 leading-snug">
                  {totalCount} {totalCount === 1 ? 'item' : 'itens'}
                </span>
              )}
            </span>
            {selected === null && (
              <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-andrequice-gold" />
            )}
          </button>

          {/* Divider */}
          <div className="mx-3 border-t border-andrequice-sand/60" />

          {/* Category items */}
          {categories.map((cat, idx) => {
            const itemIdx = idx + 1
            const isActive = selected === cat.slug
            return (
              <button
                key={cat.slug}
                ref={(el) => { itemRefs.current[itemIdx] = el }}
                role="menuitem"
                type="button"
                tabIndex={focused === itemIdx ? 0 : -1}
                onKeyDown={(e) => handleItemKeyDown(e, itemIdx)}
                onClick={() => selectItem(cat.slug)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-andrequice-cream focus-visible:bg-andrequice-cream focus-visible:outline-none ${isActive ? 'bg-andrequice-cream/60' : ''}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${cat.iconBg} ${isActive ? 'ring-1 ring-andrequice-gold/40' : ''} text-andrequice-navy`}
                >
                  <CategoryIcon d={cat.icon(isActive)} size={15} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-andrequice-navy leading-snug">
                    {cat.label}
                  </span>
                  <span className="text-xs text-andrequice-brown/60 leading-snug">
                    {counts[cat.slug] ?? 0} {(counts[cat.slug] ?? 0) === 1 ? 'item' : 'itens'}
                  </span>
                </span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-andrequice-gold" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
