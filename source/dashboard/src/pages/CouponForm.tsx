import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { PageTitle } from '@/components/PageTitle'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCoupon, useCreateCoupon, useUpdateCoupon } from '@/hooks/useCoupons'
import { useToast } from '@/hooks/useToast'

export default function CouponForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const { data: existing, isLoading } = useCoupon(isEdit ? parseInt(id) : 0)
  const createMutation = useCreateCoupon()
  const updateMutation = useUpdateCoupon()

  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [usageLimit, setUsageLimit] = useState('')
  const [minimumOrder, setMinimumOrder] = useState('')
  const [active, setActive] = useState(true)

  useEffect(() => {
    if (existing) {
      setCode(existing.code)
      setDiscountType(existing.discount_type)
      setDiscountValue(String(existing.discount_value))
      setExpiresAt(existing.expires_at ? existing.expires_at.slice(0, 10) : '')
      setUsageLimit(existing.usage_limit ? String(existing.usage_limit) : '')
      setMinimumOrder(
        existing.minimum_order_cents ? (existing.minimum_order_cents / 100).toFixed(2) : ''
      )
      setActive(existing.active)
    }
  }, [existing])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const value = parseFloat(discountValue)
    if (isNaN(value) || value <= 0) {
      toast.error('Valor do desconto inválido')
      return
    }

    const payload = {
      code: code.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: value,
      expires_at: expiresAt || undefined,
      usage_limit: usageLimit ? parseInt(usageLimit) : undefined,
      minimum_order_cents: minimumOrder
        ? Math.round(parseFloat(minimumOrder.replace(',', '.')) * 100)
        : undefined,
      active,
    }

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id: parseInt(id), data: payload })
        toast.success('Cupom atualizado com sucesso')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Cupom criado com sucesso')
      }
      navigate('/coupons')
    } catch {
      toast.error('Erro ao salvar cupom')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEdit && isLoading) return <LoadingState />

  return (
    <div className="space-y-6">
      <PageTitle
        title={isEdit ? 'Editar Cupom' : 'Novo Cupom'}
        subtitle={isEdit ? existing?.code : 'Preencha os dados do cupom'}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/coupons')}>
            <ArrowLeft className="h-4 w-4" />
            Cancelar
          </Button>
        }
      />

      <Card className="w-full">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ANDQ2025"
                required
                className="font-mono tracking-widest uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de Desconto</Label>
                <Select
                  value={discountType}
                  onValueChange={(v) => setDiscountType(v as 'percentage' | 'fixed')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="discount-value">
                  {discountType === 'percentage' ? 'Percentual (%)' : 'Valor (R$)'}
                </Label>
                <Input
                  id="discount-value"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? '10' : '0,00'}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="expires-at">Validade</Label>
                <Input
                  id="expires-at"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="usage-limit">Limite de uso</Label>
                <Input
                  id="usage-limit"
                  type="number"
                  min="1"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Sem limite"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minimum-order">Pedido mínimo (R$)</Label>
              <Input
                id="minimum-order"
                value={minimumOrder}
                onChange={(e) => setMinimumOrder(e.target.value)}
                placeholder="Sem mínimo"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={active ? 'active' : 'inactive'}
                onValueChange={(v) => setActive(v === 'active')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : isEdit ? (
                  'Salvar alterações'
                ) : (
                  'Criar cupom'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/coupons')}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
