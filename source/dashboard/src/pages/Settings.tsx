import { useState, useEffect, type FormEvent } from 'react'
import { Loader2, CheckCircle2, AlertCircle, CreditCard, MessageCircle, Truck } from 'lucide-react'
import { AdminPageGrid } from '@/components/AdminPageGrid'
import { PageTitle } from '@/components/PageTitle'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSettings, useUpdateSettings, useUpdateHeadline, useStripeInfo } from '@/hooks/useSettings'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import type { StoreSettings, HeadlineSettings } from '@/services/settingsService'

type Tab = 'apresentacao' | 'loja' | 'integracoes' | 'frete'

const TABS: { id: Tab; label: string }[] = [
  { id: 'apresentacao', label: 'Apresentação' },
  { id: 'loja',         label: 'Loja' },
  { id: 'integracoes',  label: 'Integrações' },
  { id: 'frete',        label: 'Frete' },
]

const maskWhatsApp = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 13)
  if (d.length === 0) return ''
  if (d.length <= 2)  return `+${d}`
  if (d.length <= 4)  return `+${d.slice(0, 2)} ${d.slice(2)}`
  if (d.length <= 9)  return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`
  return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('apresentacao')
  const toast = useToast()
  const { data: settings, isLoading } = useSettings()
  const updateMutation = useUpdateSettings()
  const updateHeadlineMutation = useUpdateHeadline()
  const { data: stripeInfo } = useStripeInfo()

  const [headlinePrimary, setHeadlinePrimary] = useState('')
  const [headlineSecondary, setHeadlineSecondary] = useState('')
  const [headlineDescription, setHeadlineDescription] = useState('')
  const [headlineErrors, setHeadlineErrors] = useState<Partial<HeadlineSettings>>({})

  const [footerDescription, setFooterDescription] = useState('')
  const [footerErrors, setFooterErrors] = useState<{ footer_description?: string }>({})

  const [contactEmail, setContactEmail] = useState('')
  const [pickupZipcode, setPickupZipcode] = useState('')
  const [pickupStreet, setPickupStreet] = useState('')
  const [pickupNumber, setPickupNumber] = useState('')
  const [pickupComplement, setPickupComplement] = useState('')
  const [pickupCity, setPickupCity] = useState('')
  const [pickupState, setPickupState] = useState('')
  const [zipcodeLoading, setZipcodeLoading] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [freeShippingAbove, setFreeShippingAbove] = useState('')
  const [shippingFee, setShippingFee] = useState('')

  useEffect(() => {
    if (settings) {
      setHeadlinePrimary(settings.headline_primary ?? '')
      setHeadlineSecondary(settings.headline_secondary ?? '')
      setHeadlineDescription(settings.headline_description ?? '')
      setFooterDescription(settings.footer_description ?? '')
      setContactEmail(settings.contact_email)
      setPickupZipcode(settings.pickup_zipcode)
      setPickupStreet(settings.pickup_street)
      setPickupNumber(settings.pickup_number)
      setPickupComplement(settings.pickup_complement)
      setPickupCity(settings.pickup_city)
      setPickupState(settings.pickup_state)
      setWhatsappNumber(maskWhatsApp(settings.whatsapp_number))
      setFreeShippingAbove((settings.free_shipping_above_cents / 100).toFixed(2))
      setShippingFee((settings.shipping_fee_cents / 100).toFixed(2))
    }
  }, [settings])

  const saveSection = async (data: Partial<StoreSettings>) => {
    try {
      await updateMutation.mutateAsync(data)
      toast.success('Configurações salvas')
    } catch {
      toast.error('Erro ao salvar configurações')
    }
  }

  const handleGeneralSave = (e: FormEvent) => {
    e.preventDefault()
    saveSection({
      contact_email:    contactEmail,
      pickup_zipcode:   pickupZipcode,
      pickup_street:    pickupStreet,
      pickup_number:    pickupNumber,
      pickup_complement: pickupComplement,
      pickup_city:      pickupCity,
      pickup_state:     pickupState,
    })
  }

  const handleWhatsAppSave = (e: FormEvent) => {
    e.preventDefault()
    saveSection({ whatsapp_number: whatsappNumber })
  }

  const handleShippingSave = (e: FormEvent) => {
    e.preventDefault()
    const fsa = Math.round(parseFloat(freeShippingAbove.replace(',', '.')) * 100)
    const sf = Math.round(parseFloat(shippingFee.replace(',', '.')) * 100)
    if (isNaN(fsa) || isNaN(sf)) { toast.error('Valores inválidos'); return }
    saveSection({ free_shipping_above_cents: fsa, shipping_fee_cents: sf })
  }

  const handleHeadlineSave = async (e: FormEvent) => {
    e.preventDefault()
    setHeadlineErrors({})
    try {
      await updateHeadlineMutation.mutateAsync({
        headline_primary:     headlinePrimary,
        headline_secondary:   headlineSecondary,
        headline_description: headlineDescription,
      })
      toast.success('Apresentação atualizada')
    } catch (err: any) {
      const errs = err?.response?.data?.errors ?? {}
      setHeadlineErrors(errs)
      toast.error('Erro ao salvar apresentação')
    }
  }

  const handleFooterSave = async (e: FormEvent) => {
    e.preventDefault()
    setFooterErrors({})
    try {
      await updateHeadlineMutation.mutateAsync({ footer_description: footerDescription })
      toast.success('Footer atualizado')
    } catch (err: any) {
      const errs = err?.response?.data?.errors ?? {}
      setFooterErrors(errs)
      toast.error('Erro ao salvar footer')
    }
  }

  const isSaving = updateMutation.isPending || updateHeadlineMutation.isPending
  const disabled = isSaving || isLoading

  if (isLoading) {
    return (
      <AdminPageGrid>
        <div className="col-span-full animate-pulse space-y-4 py-8">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </AdminPageGrid>
    )
  }

  return (
    <AdminPageGrid>
      {/* col-span-full: título */}
      <div className="col-span-full">
        <PageTitle title="Configurações" subtitle="Gerencie as configurações da loja" />
      </div>

      {/* col-span-full: abas */}
      <div className="col-span-full border-b border-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Abas de configurações">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ───────────────────────────── Apresentação ───────────────────────────── */}
      {activeTab === 'apresentacao' && (
        <div className="col-span-full space-y-4">
          <form onSubmit={handleHeadlineSave}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Apresentação da Loja</CardTitle>
                <CardDescription>Textos exibidos na página inicial e no catálogo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="headline-primary">Mensagem principal</Label>
                    <span className="text-xs text-muted-foreground">{headlinePrimary.length}/80</span>
                  </div>
                  <Input
                    id="headline-primary"
                    value={headlinePrimary}
                    onChange={(e) => setHeadlinePrimary(e.target.value)}
                    maxLength={80}
                    disabled={disabled}
                  />
                  {headlineErrors.headline_primary && (
                    <p className="text-xs text-destructive">{headlineErrors.headline_primary}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Exibida em destaque. Máx. 80 caracteres.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="headline-secondary">Mensagem secundária</Label>
                    <span className="text-xs text-muted-foreground">{headlineSecondary.length}/80</span>
                  </div>
                  <Input
                    id="headline-secondary"
                    value={headlineSecondary}
                    onChange={(e) => setHeadlineSecondary(e.target.value)}
                    maxLength={80}
                    disabled={disabled}
                  />
                  {headlineErrors.headline_secondary && (
                    <p className="text-xs text-destructive">{headlineErrors.headline_secondary}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Complemento da mensagem principal. Máx. 80 caracteres.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="headline-description">Descrição</Label>
                    <span className="text-xs text-muted-foreground">{headlineDescription.length}/200</span>
                  </div>
                  <textarea
                    id="headline-description"
                    value={headlineDescription}
                    onChange={(e) => setHeadlineDescription(e.target.value)}
                    maxLength={200}
                    disabled={disabled}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                  {headlineErrors.headline_description && (
                    <p className="text-xs text-destructive">{headlineErrors.headline_description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Apresentação breve da loja. Máx. 200 caracteres.</p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" disabled={disabled}>
                    {updateHeadlineMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          <form onSubmit={handleFooterSave}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Footer</CardTitle>
                <CardDescription>Texto exibido no rodapé da loja pública.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="footer-description">Descrição</Label>
                    <span className="text-xs text-muted-foreground">{footerDescription.length}/200</span>
                  </div>
                  <textarea
                    id="footer-description"
                    value={footerDescription}
                    onChange={(e) => setFooterDescription(e.target.value)}
                    maxLength={200}
                    disabled={disabled}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                  {footerErrors.footer_description && (
                    <p className="text-xs text-destructive">{footerErrors.footer_description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Texto abaixo do nome da loja no rodapé. Máx. 200 caracteres.</p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" disabled={disabled}>
                    {updateHeadlineMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      )}

      {/* ───────────────────────────── Loja ───────────────────────────── */}
      {activeTab === 'loja' && (
        <div className="col-span-full">
          <form onSubmit={handleGeneralSave}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações Gerais</CardTitle>
                <CardDescription>Dados básicos da loja: contato e endereço de retirada.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail de Contato</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Endereço de Retirada</Label>
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        placeholder="CEP (00000-000)"
                        inputMode="numeric"
                        maxLength={9}
                        value={pickupZipcode}
                        disabled={disabled || zipcodeLoading}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                          const masked =
                            digits.length > 5
                              ? `${digits.slice(0, 5)}-${digits.slice(5)}`
                              : digits
                          setPickupZipcode(masked)
                          if (digits.length === 8) {
                            setZipcodeLoading(true)
                            fetch(`https://viacep.com.br/ws/${digits}/json/`)
                              .then((r) => r.json())
                              .then((data) => {
                                if (data.erro) return
                                setPickupStreet(data.logradouro ?? '')
                                setPickupCity(data.localidade ?? '')
                                setPickupState(data.uf ?? '')
                                setPickupNumber('')
                                setPickupComplement('')
                                setTimeout(() => {
                                  document.getElementById('pickup-number')?.focus()
                                }, 50)
                              })
                              .catch(() => {})
                              .finally(() => setZipcodeLoading(false))
                          }
                        }}
                      />
                      {zipcodeLoading && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                          buscando...
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <Input
                          placeholder="Cidade"
                          value={pickupCity}
                          readOnly
                          className="bg-muted/40 text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="UF"
                          value={pickupState}
                          readOnly
                          className="bg-muted/40 text-muted-foreground"
                        />
                      </div>
                    </div>

                    <Input
                      placeholder="Endereço"
                      value={pickupStreet}
                      readOnly
                      className="bg-muted/40 text-muted-foreground"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        id="pickup-number"
                        placeholder="Número"
                        value={pickupNumber}
                        onChange={(e) => setPickupNumber(e.target.value)}
                        disabled={disabled}
                      />
                      <Input
                        placeholder="Complemento"
                        value={pickupComplement}
                        onChange={(e) => setPickupComplement(e.target.value)}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" disabled={disabled}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      )}

      {/* ───────────────────────────── Integrações ───────────────────────────── */}
      {activeTab === 'integracoes' && (
        <div className="col-span-full space-y-4">
          <form onSubmit={handleWhatsAppSave}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageCircle className="h-4 w-4 text-green-500" />
                      WhatsApp
                    </CardTitle>
                    <CardDescription>Número de suporte exibido na loja pública.</CardDescription>
                  </div>
                  <Badge variant={settings?.whatsapp_number ? 'success' : 'warning'}>
                    {settings?.whatsapp_number ? 'Configurado' : 'Pendente'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="whatsapp">Número WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(maskWhatsApp(e.target.value))}
                    placeholder="+55 31 99999-0000"
                    disabled={disabled}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" disabled={disabled}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-4 w-4 text-violet-500" />
                    Stripe
                  </CardTitle>
                  <CardDescription>Integração de pagamentos.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {stripeInfo?.mode === 'test' && <Badge variant="warning">Modo Teste</Badge>}
                  {stripeInfo?.mode === 'live' && <Badge variant="success">Modo Produção</Badge>}
                  <Badge variant={stripeInfo ? 'success' : 'secondary'}>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Ativo
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Chave Pública</Label>
                <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 py-1">
                  <span className="font-mono text-xs text-muted-foreground truncate">
                    {stripeInfo?.publishable_key_hint ?? '—'}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Chave Secreta</Label>
                <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 py-1">
                  <span className="font-mono text-xs text-muted-foreground truncate">
                    {stripeInfo?.secret_key_hint ?? '—'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Chaves gerenciadas via variáveis de ambiente no servidor.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ───────────────────────────── Frete ───────────────────────────── */}
      {activeTab === 'frete' && (
        <div className="col-span-full">
          <form onSubmit={handleShippingSave}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Truck className="h-4 w-4 text-blue-500" />
                      Frete
                    </CardTitle>
                    <CardDescription>Regras simples de frete grátis e taxa fixa.</CardDescription>
                  </div>
                  <Badge variant={settings?.shipping_fee_cents ? 'success' : 'warning'}>
                    {settings?.shipping_fee_cents ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Configurado
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Configurar
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="free-shipping">Frete grátis acima de (R$)</Label>
                    <Input
                      id="free-shipping"
                      value={freeShippingAbove}
                      onChange={(e) => setFreeShippingAbove(e.target.value)}
                      placeholder="150,00"
                      disabled={disabled}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="flat-rate">Taxa fixa de envio (R$)</Label>
                    <Input
                      id="flat-rate"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(e.target.value)}
                      placeholder="15,00"
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" disabled={disabled}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      )}
    </AdminPageGrid>
  )
}
