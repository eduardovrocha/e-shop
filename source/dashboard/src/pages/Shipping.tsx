import { useState, useEffect, type FormEvent } from 'react'
import { AlertCircle, Wifi, WifiOff, Eye, EyeOff } from 'lucide-react'
import { PageTitle } from '@/components/PageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/useToast'
import {
  useShippingSettings,
  useUpdateShippingSettings,
  useTestMelhorEnvioConnection,
  useShippingCarriers,
  useUpdateShippingCarrier,
} from '@/hooks/useShipping'
import { cn, formatCurrency } from '@/lib/utils'
import type { ShippingCarrier } from '@/types/shipping'

type Tab = 'sender' | 'melhorenvio' | 'carriers' | 'rules'

const TABS: { id: Tab; label: string }[] = [
  { id: 'sender', label: 'Origem & Remetente' },
  { id: 'melhorenvio', label: 'Melhor Envio' },
  { id: 'carriers', label: 'Transportadoras' },
  { id: 'rules', label: 'Regras de Frete' },
]

export default function Shipping() {
  const [activeTab, setActiveTab] = useState<Tab>('sender')
  const toast = useToast()

  const { data: settings, isLoading } = useShippingSettings()
  const updateMutation = useUpdateShippingSettings()
  const testMutation = useTestMelhorEnvioConnection()
  const { data: carriers, isLoading: carriersLoading } = useShippingCarriers()
  const updateCarrierMutation = useUpdateShippingCarrier()

  // ─── Sender state ─────────────────────────────────────────────────────────
  const [originZipcode, setOriginZipcode] = useState('')
  const [senderName, setSenderName] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [senderAddress, setSenderAddress] = useState('')
  const [senderNumber, setSenderNumber] = useState('')
  const [senderCity, setSenderCity] = useState('')
  const [senderState, setSenderState] = useState('')

  // ─── Melhor Envio state ───────────────────────────────────────────────────
  const [meClientId, setMeClientId] = useState('')
  const [meClientSecret, setMeClientSecret] = useState('')
  const [meAccessToken, setMeAccessToken] = useState('')
  const [meSandbox, setMeSandbox] = useState(true)
  const [showSecret, setShowSecret] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [zipcodeLoading, setZipcodeLoading] = useState(false)

  // ─── Test payload state ───────────────────────────────────────────────────
  const [testWeight, setTestWeight] = useState('0.3')
  const [testHeight, setTestHeight] = useState('4')
  const [testWidth, setTestWidth] = useState('20')
  const [testLength, setTestLength] = useState('30')
  const [testInsurance, setTestInsurance] = useState('89.90')

  // ─── Rules state ──────────────────────────────────────────────────────────
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(false)
  const [freeShippingAbove, setFreeShippingAbove] = useState('0,00')
  const [localPickupEnabled, setLocalPickupEnabled] = useState(false)
  const [globalExtraDays, setGlobalExtraDays] = useState('0')
  const [globalExtraMargin, setGlobalExtraMargin] = useState('0')

  useEffect(() => {
    if (!settings) return
    setOriginZipcode(settings.origin_zipcode)
    setSenderName(settings.sender_name)
    setSenderPhone(settings.sender_phone)
    setSenderAddress(settings.sender_address)
    setSenderNumber(settings.sender_number)
    setSenderCity(settings.sender_city)
    setSenderState(settings.sender_state)
    setMeClientId(settings.me_client_id)
    setMeSandbox(settings.me_sandbox)
    setFreeShippingEnabled(settings.free_shipping_enabled)
    setFreeShippingAbove((settings.free_shipping_above_cents / 100).toFixed(2).replace('.', ','))
    setLocalPickupEnabled(settings.local_pickup_enabled)
    setGlobalExtraDays(String(settings.global_extra_days))
    setGlobalExtraMargin(String(settings.global_extra_margin_pct))
  }, [settings])

  // ─── Submit handlers ──────────────────────────────────────────────────────
  async function handleSenderSave(e: FormEvent) {
    e.preventDefault()
    try {
      await updateMutation.mutateAsync({
        origin_zipcode: originZipcode,
        sender_name: senderName,
        sender_phone: senderPhone,
        sender_address: senderAddress,
        sender_number: senderNumber,
        sender_city: senderCity,
        sender_state: senderState,
      })
      toast.success('Dados do remetente salvos')
    } catch {
      toast.error('Erro ao salvar dados do remetente')
    }
  }

  async function handleMeSave(e: FormEvent) {
    e.preventDefault()
    const payload: Record<string, unknown> = { me_client_id: meClientId, me_sandbox: meSandbox }
    if (meClientSecret) payload.me_client_secret = meClientSecret
    if (meAccessToken) payload.me_access_token = meAccessToken
    try {
      await updateMutation.mutateAsync(payload)
      toast.success('Configurações do Melhor Envio salvas')
    } catch {
      toast.error('Erro ao salvar configurações do Melhor Envio')
    }
  }

  async function handleRulesSave(e: FormEvent) {
    e.preventDefault()
    const above = Math.round(parseFloat(freeShippingAbove.replace(',', '.')) * 100)
    const extraDays = parseInt(globalExtraDays)
    const extraMargin = parseInt(globalExtraMargin)

    if (isNaN(above) || isNaN(extraDays) || isNaN(extraMargin)) {
      toast.error('Valores inválidos')
      return
    }
    try {
      await updateMutation.mutateAsync({
        free_shipping_enabled: freeShippingEnabled,
        free_shipping_above_cents: above,
        local_pickup_enabled: localPickupEnabled,
        global_extra_days: extraDays,
        global_extra_margin_pct: extraMargin,
      })
      toast.success('Regras de frete salvas')
    } catch {
      toast.error('Erro ao salvar regras de frete')
    }
  }

  async function handleTestConnection() {
    try {
      const result = await testMutation.mutateAsync({
        weight: parseFloat(testWeight) || 0.3,
        height: parseFloat(testHeight) || 4,
        width: parseFloat(testWidth) || 20,
        length: parseFloat(testLength) || 30,
        insurance_value: parseFloat(testInsurance) || 89.9,
      })
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    } catch {
      toast.error('Erro ao testar conexão com o Melhor Envio')
    }
  }

  async function handleCarrierToggle(carrier: ShippingCarrier) {
    try {
      await updateCarrierMutation.mutateAsync({
        id: carrier.id,
        data: { enabled: !carrier.enabled },
      })
    } catch {
      toast.error(`Erro ao atualizar ${carrier.display_name}`)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
      <PageTitle
        title="Frete"
        subtitle="Configurações de envio e transportadoras"
        actions={
          settings?.me_configured ? (
            <Badge variant="success" className="flex items-center gap-1.5">
              <Wifi className="h-3 w-3" />
              Melhor Envio configurado
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <WifiOff className="h-3 w-3" />
              Melhor Envio não configurado
            </Badge>
          )
        }
      />

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-1" aria-label="Abas de configuração de frete">
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

      {/* ── Tab: Origem & Remetente ─────────────────────────────────────────── */}
      {activeTab === 'sender' && (
        <form onSubmit={handleSenderSave}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do Remetente</CardTitle>
              <CardDescription>
                Endereço de origem usado no cálculo de frete e nas etiquetas de envio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>CEP de Origem</Label>
                <div className="relative">
                  <Input
                    placeholder="00000-000"
                    inputMode="numeric"
                    maxLength={9}
                    value={originZipcode}
                    disabled={zipcodeLoading}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                      const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
                      setOriginZipcode(masked)

                      if (digits.length === 8) {
                        setZipcodeLoading(true)
                        fetch(`https://viacep.com.br/ws/${digits}/json/`)
                          .then((r) => r.json())
                          .then((data) => {
                            if (data.erro) return
                            setSenderAddress(data.logradouro ?? '')
                            setSenderNumber('')
                            setSenderCity(data.localidade ?? '')
                            setSenderState(data.uf ?? '')
                            setTimeout(() => {
                              document.getElementById('sender-number')?.focus()
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
              </div>
              <div>
                <Label>Nome do Remetente</Label>
                <Input
                  placeholder="Nome da loja ou pessoa"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                  maxLength={15}
                  value={senderPhone}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 11)
                    const masked =
                      d.length <= 2 ? d :
                      d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` :
                      d.length <= 10
                        ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
                        : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
                    setSenderPhone(masked)
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    placeholder="Rua, Av..."
                    value={senderAddress}
                    onChange={(e) => setSenderAddress(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input
                    id="sender-number"
                    placeholder="123"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade</Label>
                  <Input
                    placeholder="Cidade"
                    value={senderCity}
                    onChange={(e) => setSenderCity(e.target.value)}
                  />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input
                    placeholder="MG"
                    maxLength={2}
                    value={senderState}
                    onChange={(e) => setSenderState(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* ── Tab: Melhor Envio ───────────────────────────────────────────────── */}
      {activeTab === 'melhorenvio' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credenciais do Melhor Envio</CardTitle>
              <CardDescription>
                Acesse{' '}
                <span className="font-medium text-foreground">melhorenvio.com.br</span> →
                Integrações → Aplicativos para obter as credenciais OAuth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMeSave} className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Ambiente Sandbox</p>
                    <p className="text-xs text-muted-foreground">
                      Use o sandbox para testes. Desative para produção.
                    </p>
                  </div>
                  <Toggle checked={meSandbox} onChange={setMeSandbox} />
                </div>

                <div>
                  <Label>Client ID</Label>
                  <Input
                    placeholder="ID do aplicativo"
                    value={meClientId}
                    onChange={(e) => setMeClientId(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Client Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      placeholder={settings?.me_client_secret_set ? 'Definido — deixe em branco para manter' : 'Client secret'}
                      value={meClientSecret}
                      onChange={(e) => setMeClientSecret(e.target.value)}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showSecret ? 'Ocultar client secret' : 'Exibir client secret'}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {!settings?.me_client_secret_set && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      Sem client secret configurado.
                    </p>
                  )}
                </div>

                <div>
                  <Label>Access Token</Label>
                  <div className="relative">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      placeholder={settings?.me_access_token_set ? 'Definido — deixe em branco para manter' : 'Access token'}
                      value={meAccessToken}
                      onChange={(e) => setMeAccessToken(e.target.value)}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showToken ? 'Ocultar access token' : 'Exibir access token'}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {!settings?.me_access_token_set && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      Sem token. O cálculo de frete não funcionará.
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-border p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pacote de Teste
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Peso (kg)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.3"
                        value={testWeight}
                        onChange={(e) => setTestWeight(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Valor segurado (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="89.90"
                        value={testInsurance}
                        onChange={(e) => setTestInsurance(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Largura (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="20"
                        value={testWidth}
                        onChange={(e) => setTestWidth(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Altura (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="4"
                        value={testHeight}
                        onChange={(e) => setTestHeight(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Comprimento (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="30"
                        value={testLength}
                        onChange={(e) => setTestLength(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={testMutation.isPending}
                  >
                    {testMutation.isPending ? 'Testando...' : 'Testar Conexão'}
                  </Button>
                  <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab: Transportadoras ────────────────────────────────────────────── */}
      {activeTab === 'carriers' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transportadoras</CardTitle>
            <CardDescription>
              Habilite ou desabilite transportadoras. Apenas as ativas aparecem no cálculo de frete.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {carriersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : (
              <CarrierList
                carriers={carriers ?? []}
                onToggle={handleCarrierToggle}
                isPending={updateCarrierMutation.isPending}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Regras de Frete ────────────────────────────────────────────── */}
      {activeTab === 'rules' && (
        <form onSubmit={handleRulesSave}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regras Globais de Frete</CardTitle>
              <CardDescription>
                Aplicadas sobre todos os resultados do Melhor Envio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Frete Grátis Global</p>
                  <p className="text-xs text-muted-foreground">
                    Oferecer frete grátis quando o pedido atingir o valor mínimo.
                  </p>
                </div>
                <Toggle checked={freeShippingEnabled} onChange={setFreeShippingEnabled} />
              </div>

              {freeShippingEnabled && (
                <div>
                  <Label>Valor mínimo para frete grátis (R$)</Label>
                  <Input
                    placeholder="0,00"
                    value={freeShippingAbove}
                    onChange={(e) => setFreeShippingAbove(e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Retirada na Loja</p>
                  <p className="text-xs text-muted-foreground">
                    Exibir opção de retirada gratuita no checkout.
                  </p>
                </div>
                <Toggle checked={localPickupEnabled} onChange={setLocalPickupEnabled} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prazo Extra Global (dias)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={globalExtraDays}
                    onChange={(e) => setGlobalExtraDays(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Somado ao prazo de todas as transportadoras.
                  </p>
                </div>
                <div>
                  <Label>Margem Global (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0"
                    value={globalExtraMargin}
                    onChange={(e) => setGlobalExtraMargin(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Acréscimo percentual sobre o preço calculado.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        checked ? 'bg-foreground' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

function CarrierList({
  carriers,
  onToggle,
  isPending,
}: {
  carriers: ShippingCarrier[]
  onToggle: (c: ShippingCarrier) => void
  isPending: boolean
}) {
  const grouped = carriers.reduce<Record<string, ShippingCarrier[]>>((acc, c) => {
    if (!acc[c.company]) acc[c.company] = []
    acc[c.company].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([company, items]) => (
        <div key={company}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {company}
          </p>
          <div className="rounded-lg border border-border divide-y divide-border">
            {items.map((carrier) => (
              <div key={carrier.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{carrier.name}</p>
                  {carrier.min_value_cents > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Mín: {formatCurrency(carrier.min_value_cents)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={carrier.enabled ? 'success' : 'secondary'}>
                    {carrier.enabled ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Toggle
                    checked={carrier.enabled}
                    onChange={() => !isPending && onToggle(carrier)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
