import { useState, useRef, useEffect } from 'react'
import { GripVertical, Pencil, Trash2, Check, X, Plus, Tag, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useCategories } from '@/hooks/useCategories'
import { categoriesService } from '@/services/categoriesService'
import type { CategoryResponse } from '@/services/categoriesService'
import { useQueryClient } from '@tanstack/react-query'

// ── Draft types ────────────────────────────────────────────────────────────────

interface DraftCategory {
  key: string
  id?: number
  name: string
  position: number
  products_count: number
  isNew?: boolean
  isDeleted?: boolean
  originalName?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (autoSelectName?: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function tempKey() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function toDraft(cats: CategoryResponse[]): DraftCategory[] {
  return cats.map((c) => ({
    key:           String(c.id),
    id:            c.id,
    name:          c.name,
    position:      c.position,
    products_count: c.products_count,
    originalName:  c.name,
  }))
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CategoryManagerModal({ open, onOpenChange, onSaved }: Props) {
  const qc = useQueryClient()

  const { data: serverCategories } = useCategories()

  // Keep a stable ref so the open-effect can read the latest value
  // without listing serverCategories as a dependency (new array ref every render
  // would cause the effect — and setDraft — to fire on every render → infinite loop)
  const serverCategoriesRef = useRef<CategoryResponse[]>([])
  if (serverCategories) serverCategoriesRef.current = serverCategories

  const [draft, setDraft]             = useState<DraftCategory[]>([])
  const [newName, setNewName]         = useState('')
  const [editingKey, setEditingKey]   = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)

  // Drag state
  const [draggedKey, setDraggedKey]   = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const newInputRef  = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Initialise draft only when the modal transitions to open
  useEffect(() => {
    if (open) {
      setDraft(toDraft(serverCategoriesRef.current))
      setNewName('')
      setEditingKey(null)
      setSaveError(null)
    }
  }, [open])

  // Focus edit input when inline edit starts
  useEffect(() => {
    if (editingKey) editInputRef.current?.focus()
  }, [editingKey])

  // ── Derived ──────────────────────────────────────────────────────────────────

  const visible = draft.filter((c) => !c.isDeleted)

  // ── Add ──────────────────────────────────────────────────────────────────────

  function handleAdd() {
    const trimmed = newName.trim().toLowerCase()
    if (!trimmed) return
    if (visible.some((c) => c.name === trimmed)) {
      setSaveError(`Categoria "${trimmed}" já existe.`)
      return
    }
    setSaveError(null)
    const key = tempKey()
    setDraft((prev) => [
      ...prev,
      { key, name: trimmed, position: visible.length, products_count: 0, isNew: true },
    ])
    setNewName('')
    newInputRef.current?.focus()
  }

  // ── Inline edit ───────────────────────────────────────────────────────────────

  function startEdit(cat: DraftCategory) {
    setEditingKey(cat.key)
    setEditingName(cat.name)
  }

  function commitEdit(key: string) {
    const trimmed = editingName.trim().toLowerCase()
    if (!trimmed) { cancelEdit(); return }
    if (visible.some((c) => c.key !== key && c.name === trimmed)) {
      setSaveError(`Categoria "${trimmed}" já existe.`)
      return
    }
    setSaveError(null)
    setDraft((prev) =>
      prev.map((c) => (c.key === key ? { ...c, name: trimmed } : c))
    )
    setEditingKey(null)
  }

  function cancelEdit() {
    setEditingKey(null)
    setSaveError(null)
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  function handleDelete(cat: DraftCategory) {
    if (cat.isNew) {
      setDraft((prev) => prev.filter((c) => c.key !== cat.key))
      return
    }
    // Toggle deleted — allows un-delete before saving
    setDraft((prev) =>
      prev.map((c) => (c.key === cat.key ? { ...c, isDeleted: !c.isDeleted } : c))
    )
  }

  // ── Drag-and-drop ─────────────────────────────────────────────────────────────

  function handleDragStart(key: string) {
    setDraggedKey(key)
  }

  function handleDragOver(e: React.DragEvent, key: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (key !== draggedKey) setDragOverKey(key)
  }

  function handleDrop(targetKey: string) {
    if (!draggedKey || draggedKey === targetKey) {
      setDraggedKey(null)
      setDragOverKey(null)
      return
    }
    const items = draft.filter((c) => !c.isDeleted)
    const from  = items.findIndex((c) => c.key === draggedKey)
    const to    = items.findIndex((c) => c.key === targetKey)
    const reordered = [...items]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const withPositions = reordered.map((c, i) => ({ ...c, position: i }))
    setDraft(withPositions)
    setDraggedKey(null)
    setDragOverKey(null)
  }

  function handleDragEnd() {
    setDraggedKey(null)
    setDragOverKey(null)
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    try {
      const survived  = draft.filter((c) => !c.isDeleted)
      const toCreate  = survived.filter((c) => c.isNew)
      const toDelete  = draft.filter((c) => c.isDeleted && c.id)
      const toRename  = survived.filter(
        (c) => !c.isNew && c.id && c.name !== c.originalName
      )

      // 1. Create new categories — collect returned ids
      const created = await Promise.all(
        toCreate.map((c) => categoriesService.create(c.name))
      )

      // 2. Delete removed categories
      await Promise.all(toDelete.map((c) => categoriesService.destroy(c.id!)))

      // 3. Rename changed categories
      await Promise.all(toRename.map((c) => categoriesService.update(c.id!, c.name)))

      // 4. Reorder — map temp keys to real ids
      const keyToId: Record<string, number> = {}
      toCreate.forEach((c, i) => { keyToId[c.key] = created[i].id })

      const reorderPayload = survived
        .map((c, i) => ({
          id:       c.id ?? keyToId[c.key],
          position: i,
        }))
        .filter((x): x is { id: number; position: number } => x.id != null)

      if (reorderPayload.length > 0) {
        await categoriesService.reorder(reorderPayload)
      }

      await qc.invalidateQueries({ queryKey: ['categories'] })

      // Auto-select if exactly one category was created
      const autoSelect = toCreate.length === 1 ? created[0].name : undefined
      onSaved(autoSelect)
      onOpenChange(false)
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v) }}>
      <DialogContent
        className="max-w-md"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Gerenciar categorias
          </DialogTitle>
        </DialogHeader>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">

          {/* Add new */}
          <div className="flex gap-2">
            <Input
              ref={newInputRef}
              placeholder="Nova categoria..."
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setSaveError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
              className="h-9"
              disabled={saving}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAdd}
              disabled={!newName.trim() || saving}
              className="shrink-0 h-9 gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>

          {/* Error */}
          {saveError && (
            <p className="text-xs text-destructive font-medium">{saveError}</p>
          )}

          {/* Category list */}
          {visible.length === 0 && !draft.some((c) => c.isDeleted) ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma categoria. Adicione uma acima.
            </p>
          ) : (
            <ul role="list" className="flex flex-col gap-0.5">
              {draft.map((cat) => {
                if (cat.isDeleted) {
                  // Tombstone row — shows undo option
                  return (
                    <li
                      key={cat.key}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20 text-sm"
                    >
                      <span className="flex-1 line-through text-muted-foreground">
                        {cat.name}
                      </span>
                      {cat.products_count > 0 && (
                        <span className="text-xs text-destructive">
                          {cat.products_count} produto{cat.products_count !== 1 ? 's' : ''}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Desfazer
                      </button>
                    </li>
                  )
                }

                const isEditing  = editingKey === cat.key
                const isDragging = draggedKey  === cat.key
                const isOver     = dragOverKey === cat.key && draggedKey !== cat.key

                return (
                  <li
                    key={cat.key}
                    draggable
                    onDragStart={() => handleDragStart(cat.key)}
                    onDragOver={(e) => handleDragOver(e, cat.key)}
                    onDrop={() => handleDrop(cat.key)}
                    onDragEnd={handleDragEnd}
                    className={[
                      'flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors select-none',
                      isDragging ? 'opacity-40 border-primary/40 bg-accent'  : 'border-transparent bg-transparent',
                      isOver     ? 'border-primary/60 bg-primary/5'          : '',
                      !isDragging && !isOver ? 'hover:bg-muted/50'           : '',
                    ].join(' ')}
                  >
                    {/* Grip handle */}
                    <button
                      type="button"
                      className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
                      tabIndex={-1}
                      aria-hidden
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>

                    {/* Name / inline edit */}
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-1.5">
                        <Input
                          ref={editInputRef}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitEdit(cat.key) }
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          className="h-7 text-sm flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => commitEdit(cat.key)}
                          className="text-primary hover:text-primary/80 transition-colors"
                          aria-label="Confirmar edição"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Cancelar edição"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium capitalize leading-none">
                          {cat.name}
                          {cat.isNew && (
                            <span className="ml-1.5 text-xs font-normal text-primary">nova</span>
                          )}
                        </span>

                        <Badge variant="secondary" className="text-xs h-5 px-1.5 font-normal">
                          {cat.products_count} {cat.products_count === 1 ? 'produto' : 'produtos'}
                        </Badge>

                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={`Editar categoria ${cat.name}`}
                          disabled={saving}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className={[
                            'transition-colors',
                            cat.products_count > 0
                              ? 'text-muted-foreground/40 cursor-not-allowed'
                              : 'text-muted-foreground hover:text-destructive',
                          ].join(' ')}
                          title={
                            cat.products_count > 0
                              ? `Possui ${cat.products_count} produto(s) — reatribua antes de excluir`
                              : `Excluir categoria ${cat.name}`
                          }
                          aria-label={`Excluir categoria ${cat.name}`}
                          disabled={cat.products_count > 0 || saving}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
