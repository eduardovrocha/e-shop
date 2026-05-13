import { useRef, useState, useCallback } from 'react'
import { Upload, X, Star, GripVertical, AlertCircle, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useUploadImages, useDeleteImage, useReorderImages, useSetPrimaryImage } from '@/hooks/useProductImages'
import type { ProductImage } from '@/types/product'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 5
const MAX_IMAGES = 10

interface Props {
  productId: number
  images: ProductImage[]
}

export function ProductImageUploader({ productId, images }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localErrors, setLocalErrors] = useState<string[]>([])
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [localImages, setLocalImages] = useState<ProductImage[]>(images)

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const uploadMutation   = useUploadImages(productId)
  const deleteMutation   = useDeleteImage(productId)
  const reorderMutation  = useReorderImages(productId)
  const primaryMutation  = useSetPrimaryImage(productId)

  // Keep localImages in sync when server data changes
  const syncedImages = uploadMutation.data?.images
    ?? deleteMutation.data?.images
    ?? reorderMutation.data?.images
    ?? primaryMutation.data?.images
    ?? images

  const validateFiles = (files: File[]) => {
    const errors: string[] = []
    const valid: File[] = []

    if (syncedImages.length >= MAX_IMAGES) {
      setLocalErrors([`Limite de ${MAX_IMAGES} imagens atingido`])
      return []
    }

    files.forEach((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) {
        errors.push(`${f.name}: formato não suportado`)
      } else if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        errors.push(`${f.name}: excede ${MAX_SIZE_MB} MB`)
      } else {
        valid.push(f)
      }
    })

    setLocalErrors(errors)
    return valid
  }

  const handleFiles = useCallback((files: File[]) => {
    const valid = validateFiles(files)
    if (valid.length > 0) uploadMutation.mutate(valid)
  }, [syncedImages.length])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }

  // Drag-and-drop reorder
  const onDragStart = (id: number) => setDraggedId(id)

  const onDropImage = (targetId: number) => {
    if (draggedId === null || draggedId === targetId) return
    const current = [...syncedImages]
    const from = current.findIndex((i) => i.id === draggedId)
    const to   = current.findIndex((i) => i.id === targetId)
    if (from === -1 || to === -1) return
    const reordered = [...current]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setLocalImages(reordered)
    reorderMutation.mutate(reordered.map((i) => i.id))
    setDraggedId(null)
  }

  const displayImages = localImages.length !== syncedImages.length ? syncedImages : localImages.length > 0 ? localImages : syncedImages

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors',
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50',
        ].join(' ')}
      >
        <Upload className="h-8 w-8 text-gray-400" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">Arraste imagens ou clique para selecionar</p>
          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WebP · máx {MAX_SIZE_MB} MB · até {MAX_IMAGES} imagens</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {/* Upload progress */}
      {uploadMutation.isPending && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Enviando...</span>
            <span>{uploadMutation.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${uploadMutation.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Server warnings */}
      {uploadMutation.data?.warnings?.map((w) => (
        <div key={w} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {w}
        </div>
      ))}

      {/* Validation errors */}
      {localErrors.map((e) => (
        <div key={e} className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {e}
        </div>
      ))}

      {/* Image grid */}
      {syncedImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {displayImages.map((img, idx) => (
            <ImageCard
              key={img.id}
              image={img}
              isPrimary={idx === 0}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === img.id}
              isSettingPrimary={primaryMutation.isPending && primaryMutation.variables === img.id}
              onDelete={() => setDeleteConfirmId(img.id)}
              onSetPrimary={() => primaryMutation.mutate(img.id)}
              onDragStart={() => onDragStart(img.id)}
              onDrop={() => onDropImage(img.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-6 text-gray-400">
          <ImageIcon className="h-10 w-10" />
          <p className="text-sm">Nenhuma imagem adicionada</p>
        </div>
      )}
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Remover imagem"
        description="Tem certeza que deseja excluir esta imagem? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteConfirmId !== null) {
            deleteMutation.mutate(deleteConfirmId, {
              onSettled: () => setDeleteConfirmId(null),
            })
          }
        }}
      />
    </div>
  )
}

interface CardProps {
  image: ProductImage
  isPrimary: boolean
  isDeleting: boolean
  isSettingPrimary: boolean
  onDelete: () => void
  onSetPrimary: () => void
  onDragStart: () => void
  onDrop: () => void
}

function ImageCard({ image, isPrimary, isDeleting, isSettingPrimary, onDelete, onSetPrimary, onDragStart, onDrop }: CardProps) {
  const [over, setOver] = useState(false)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop() }}
      className={[
        'relative group rounded-xl overflow-hidden border-2 transition-all',
        isPrimary ? 'border-amber-400' : 'border-transparent',
        over ? 'scale-95 border-blue-400' : '',
        isDeleting ? 'opacity-40' : '',
      ].join(' ')}
    >
      <div className="aspect-square bg-gray-100">
        <img
          src={image.thumb_url}
          alt={image.filename}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = image.url }}
        />
      </div>

      {/* Drag handle */}
      <div className="absolute top-1 left-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="rounded bg-black/40 p-0.5">
          <GripVertical className="h-3.5 w-3.5 text-white" />
        </div>
      </div>

      {/* Primary badge */}
      {isPrimary && (
        <div className="absolute top-1 right-1">
          <div className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
            Principal
          </div>
        </div>
      )}

      {/* Actions overlay */}
      <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
        {!isPrimary && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 flex-1 bg-white/20 px-1 text-[10px] text-white hover:bg-white/40"
            onClick={onSetPrimary}
            disabled={isSettingPrimary}
          >
            <Star className="mr-1 h-3 w-3" />
            Principal
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-6 bg-white/20 px-1.5 text-white hover:bg-red-500/70"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
