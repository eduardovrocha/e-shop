import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import { isAxiosError } from 'axios'
import { PageTitle } from '@/components/PageTitle'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/useToast'
import {
  useStripeAdminSettings,
  useSwitchStripeMode,
  useUpdateStripeSettings,
} from '@/hooks/useStripeAdminSettings'
import type {
  StripeMode,
  StripeModeCredentialsSummary,
  StripeSettingsUpdatePayload,
} from '@/services/stripeSettingsService'

// Mirrors the backend constant. Backend re-validates this exact string;
// keeping the constant duplicated here is intentional — there is no shared
// schema layer between dashboard and API, and the value never changes.
const PRODUCTION_TEST_PHRASE = 'ATIVAR MODO TESTE EM PRODUCAO'

const MODE_LABEL: Record<StripeMode, string> = {
  test: 'Modo Teste',
  live: 'Modo Produção',
}

const FIELD_LABEL = {
  publishable_key: 'Chave pública',
  secret_key: 'Chave secreta',
  webhook_secret: 'Webhook secret',
} as const

type FieldKey = keyof typeof FIELD_LABEL

function dateFormatter(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function extractApiError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string; errors?: string[] } | undefined
    if (data?.error) return data.error
    if (data?.errors?.length) return data.errors.join(', ')
  }
  return fallback
}

export default function StripeAdmin() {
  const toast = useToast()
  const { data, isLoading, error } = useStripeAdminSettings()
  const updateMutation = useUpdateStripeSettings()
  const switchMutation = useSwitchStripeMode()

  const [draftTest, setDraftTest] = useState<Record<FieldKey, string>>({
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
  })
  const [draftLive, setDraftLive] = useState<Record<FieldKey, string>>({
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
  })

  const [phrase, setPhrase] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingMode, setPendingMode] = useState<StripeMode | null>(null)

  const targetMode: StripeMode = data?.active_mode === 'live' ? 'test' : 'live'
  const targetCredentialsReady = useMemo(() => {
    if (!data) return false
    const summary = data[targetMode]
    return (
      summary.publishable_key_configured &&
      summary.secret_key_configured &&
      summary.webhook_secret_configured
    )
  }, [data, targetMode])

  function missingKeysFor(summary: StripeModeCredentialsSummary): string[] {
    const missing: string[] = []
    if (!summary.publishable_key_configured) missing.push(FIELD_LABEL.publishable_key)
    if (!summary.secret_key_configured) missing.push(FIELD_LABEL.secret_key)
    if (!summary.webhook_secret_configured) missing.push(FIELD_LABEL.webhook_secret)
    return missing
  }

  async function handleSave(mode: StripeMode, e: FormEvent) {
    e.preventDefault()
    const draft = mode === 'test' ? draftTest : draftLive
    const payload: StripeSettingsUpdatePayload = {}
    if (draft.publishable_key) payload[`${mode}_publishable_key`] = draft.publishable_key
    if (draft.secret_key) payload[`${mode}_secret_key`] = draft.secret_key
    if (draft.webhook_secret) payload[`${mode}_webhook_secret`] = draft.webhook_secret

    if (Object.keys(payload).length === 0) {
      toast.warning('Preencha pelo menos um campo para salvar.')
      return
    }

    try {
      await updateMutation.mutateAsync(payload)
      toast.success(`Credenciais do ${MODE_LABEL[mode].toLowerCase()} salvas.`)
      if (mode === 'test') {
        setDraftTest({ publishable_key: '', secret_key: '', webhook_secret: '' })
      } else {
        setDraftLive({ publishable_key: '', secret_key: '', webhook_secret: '' })
      }
    } catch (err) {
      toast.error(extractApiError(err, 'Erro ao salvar credenciais.'))
    }
  }

  function requestSwitch(newMode: StripeMode) {
    if (!data) return
    setPendingMode(newMode)
    setPhrase('')
    // The confirmation modal is required only in Vite-built production. In
    // dev (`import.meta.env.PROD === false`) the dashboard fires the switch
    // immediately — matches the backend rule that ignores the phrase outside
    // Rails.env.production?.
    if (import.meta.env.PROD && data.active_mode === 'live' && newMode === 'test') {
      setConfirmOpen(true)
    } else {
      performSwitch(newMode, undefined)
    }
  }

  async function performSwitch(newMode: StripeMode, confirmation: string | undefined) {
    try {
      await switchMutation.mutateAsync({
        new_mode: newMode,
        ...(confirmation !== undefined && { confirmation_phrase: confirmation }),
      })
      toast.success(`Modo alterado para ${MODE_LABEL[newMode].toLowerCase()}.`)
      setConfirmOpen(false)
      setPendingMode(null)
      setPhrase('')
    } catch (err) {
      toast.error(extractApiError(err, 'Falha ao alternar o modo.'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Não foi possível carregar a configuração Stripe.
      </div>
    )
  }

  const activeBadge =
    data.active_mode === 'test' ? (
      <Badge variant="warning">Modo Teste</Badge>
    ) : (
      <Badge variant="success">Modo Produção</Badge>
    )

  const switchDisabled = !targetCredentialsReady || switchMutation.isPending
  const switchTooltip = !targetCredentialsReady
    ? `Faltam credenciais do ${MODE_LABEL[targetMode].toLowerCase()}: ${missingKeysFor(
        data[targetMode],
      ).join(', ')}.`
    : ''

  return (
    <div className="space-y-6">
      <PageTitle
        title="Stripe"
        subtitle="Credenciais e modo de operação dos pagamentos."
      />

      {/* ── Modo ativo ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                Modo ativo {activeBadge}
              </CardTitle>
              <CardDescription>
                {data.active_mode === 'test'
                  ? 'Pagamentos rodando em modo teste — nenhuma cobrança real é processada.'
                  : 'Pagamentos rodando em modo produção — cobranças reais estão ativas.'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={data.active_mode === 'live' ? 'outline' : 'default'}
                size="sm"
                disabled={switchDisabled}
                title={switchTooltip}
                onClick={() => requestSwitch(targetMode)}
              >
                {switchMutation.isPending && pendingMode === targetMode ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : null}
                Alternar para {MODE_LABEL[targetMode].toLowerCase()}
              </Button>
            </div>
          </div>
        </CardHeader>
        {!targetCredentialsReady && (
          <CardContent>
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{switchTooltip}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Credenciais ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <CredentialsCard
          mode="test"
          summary={data.test}
          draft={draftTest}
          setDraft={setDraftTest}
          saving={updateMutation.isPending}
          onSubmit={(e) => handleSave('test', e)}
        />
        <CredentialsCard
          mode="live"
          summary={data.live}
          draft={draftLive}
          setDraft={setDraftLive}
          saving={updateMutation.isPending}
          onSubmit={(e) => handleSave('live', e)}
        />
      </div>

      {/* ── Histórico ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de trocas</CardTitle>
          <CardDescription>Últimas 20 alternâncias de modo.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent_changes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma troca registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="pb-2 pr-4">Quando</th>
                    <th className="pb-2 pr-4">Admin</th>
                    <th className="pb-2 pr-4">De → Para</th>
                    <th className="pb-2">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.recent_changes.map((entry, idx) => (
                    <tr key={`${entry.created_at}-${idx}`} className="text-sm">
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                        {dateFormatter(entry.created_at)}
                      </td>
                      <td className="py-2 pr-4">{entry.admin_email ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <span className="font-medium">{MODE_LABEL[entry.previous_mode]}</span>
                        <span className="px-1 text-muted-foreground">→</span>
                        <span className="font-medium">{MODE_LABEL[entry.new_mode]}</span>
                      </td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">
                        {entry.ip_address ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Confirmação dupla (prod live → test) ────────────────────────── */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) {
            setPhrase('')
            setPendingMode(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Ativar modo teste em produção
            </DialogTitle>
            <DialogDescription>
              Você está prestes a ativar o modo teste em ambiente de produção. Nenhuma cobrança
              real será processada enquanto este modo estiver ativo. Para confirmar, digite
              exatamente a frase abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="rounded-md bg-muted px-3 py-2 font-mono text-sm">
              {PRODUCTION_TEST_PHRASE}
            </div>
            <Input
              autoFocus
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="Digite a frase exata"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={phrase !== PRODUCTION_TEST_PHRASE || switchMutation.isPending}
              onClick={() => pendingMode && performSwitch(pendingMode, phrase)}
            >
              {switchMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar troca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface CredentialsCardProps {
  mode: StripeMode
  summary: StripeModeCredentialsSummary
  draft: Record<FieldKey, string>
  setDraft: React.Dispatch<React.SetStateAction<Record<FieldKey, string>>>
  saving: boolean
  onSubmit: (e: FormEvent) => void
}

function CredentialsCard({
  mode,
  summary,
  draft,
  setDraft,
  saving,
  onSubmit,
}: CredentialsCardProps) {
  function FieldRow(props: { field: FieldKey; type: 'text' | 'password' }) {
    const { field, type } = props
    const configured = summary[`${field}_configured`]
    const hint = summary[`${field}_hint`]
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${mode}-${field}`}>{FIELD_LABEL[field]}</Label>
          {configured ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              Configurado · <span className="font-mono">{hint}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Não configurado</span>
          )}
        </div>
        <Input
          id={`${mode}-${field}`}
          type={type}
          autoComplete="off"
          placeholder={configured ? '••••••••' : undefined}
          value={draft[field]}
          onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))}
        />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{MODE_LABEL[mode]}</CardTitle>
        <CardDescription>
          {mode === 'test'
            ? 'Use chaves pk_test_/sk_test_ — nenhum dinheiro real envolvido.'
            : 'Chaves pk_live_/sk_live_ — cobranças reais. Trate como secreto.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={onSubmit}>
          <FieldRow field="publishable_key" type="text" />
          <FieldRow field="secret_key" type="password" />
          <FieldRow field="webhook_secret" type="password" />
          <div className="flex justify-end pt-2">
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Salvar credenciais
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Deixe um campo em branco para manter o valor atual.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
