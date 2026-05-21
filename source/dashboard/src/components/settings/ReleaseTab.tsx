import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import { isAxiosError } from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useReleaseStatus, useWipeRelease } from '@/hooks/useRelease'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/useToast'

// Mirrors backend ReleaseController::WIPE_CONFIRMATION_PHRASE. Backend
// re-validates, so this constant exists only to gate the modal button.
const CONFIRMATION_PHRASE = 'ZERAR DADOS PARA RELEASE'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function ReleaseTab() {
  const toast = useToast()
  const { user } = useAuthStore()
  const { data, isLoading, error } = useReleaseStatus()
  const wipeMutation = useWipeRelease()

  const [modalOpen, setModalOpen] = useState(false)
  const [phrase, setPhrase] = useState('')

  const isSuperAdmin = user?.role === 'super_admin'
  const blockedByPreviousRun = data?.already_executed && !data?.rewipe_allowed

  async function executeWipe() {
    try {
      const result = await wipeMutation.mutateAsync(phrase)
      toast.success(
        `Release executado. ${result.counts.orders} pedidos, ${result.counts.customers} clientes removidos.`,
      )
      setModalOpen(false)
      setPhrase('')
    } catch (err) {
      let msg = 'Falha ao executar release.'
      if (isAxiosError(err)) {
        msg = (err.response?.data as { error?: string })?.error ?? msg
      }
      toast.error(msg)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Não foi possível carregar o status do release.
      </div>
    )
  }

  return (
    <div className="col-span-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Iniciar release da aplicação
          </CardTitle>
          <CardDescription>
            Use este comando uma única vez, quando as configurações da loja, produtos e
            integrações estiverem finalizadas, para zerar dados de testes e iniciar a
            operação com a base limpa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />O que será apagado
            </div>
            <ul className="ml-5 list-disc space-y-1">
              <li>Todos os pedidos (orders, itens de produção e histórico de status)</li>
              <li>Toda a base de clientes (clientes e endereços)</li>
              <li>Fila de produção (todos os order_items)</li>
              <li>Registros de webhook processados pelo Stripe</li>
              <li>Progresso de onboarding (todos os admins refazem o tour)</li>
              <li>Reservas de estoque (reserved_quantity = 0)</li>
            </ul>
            <p className="mt-3 text-xs">
              <strong>Não será apagado:</strong> produtos, categorias, usuários,
              configurações da loja, integrações Stripe, frete, e histórico de
              alternância de modo Stripe.
            </p>
          </div>

          {data.already_executed && data.last_execution && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold text-emerald-900">
                <CheckCircle2 className="h-4 w-4" />
                Release já executado
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-emerald-900">
                <dt className="font-medium">Quando:</dt>
                <dd>{formatDate(data.last_execution.executed_at)}</dd>
                <dt className="font-medium">Executado por:</dt>
                <dd>{data.last_execution.admin_email ?? '—'}</dd>
                <dt className="font-medium">IP:</dt>
                <dd className="font-mono">{data.last_execution.ip_address ?? '—'}</dd>
                <dt className="font-medium">Pedidos apagados:</dt>
                <dd>{data.last_execution.orders_deleted}</dd>
                <dt className="font-medium">Itens apagados:</dt>
                <dd>{data.last_execution.order_items_deleted}</dd>
                <dt className="font-medium">Clientes apagados:</dt>
                <dd>{data.last_execution.customers_deleted}</dd>
              </dl>
              {data.rewipe_allowed && (
                <p className="mt-3 text-xs">
                  <Badge variant="warning">ALLOW_RELEASE_REWIPE ativo</Badge>
                  <span className="ml-2">
                    Reexecução habilitada via variável de ambiente no servidor.
                  </span>
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {!isSuperAdmin && (
                <span>Apenas usuários com papel <strong>super_admin</strong> podem executar.</span>
              )}
              {isSuperAdmin && blockedByPreviousRun && (
                <span>
                  Para reexecutar, defina <code>ALLOW_RELEASE_REWIPE=yes</code> no servidor.
                </span>
              )}
            </div>
            <Button
              variant="destructive"
              disabled={!isSuperAdmin || blockedByPreviousRun || wipeMutation.isPending}
              onClick={() => {
                setPhrase('')
                setModalOpen(true)
              }}
            >
              Executar release wipe
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setPhrase('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Confirmar release wipe
            </DialogTitle>
            <DialogDescription>
              Esta ação apaga pedidos, clientes e fila de produção. <strong>É irreversível.</strong>
              {' '}
              Para confirmar, digite exatamente a frase abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="rounded-md bg-muted px-3 py-2 font-mono text-sm">
              {CONFIRMATION_PHRASE}
            </div>
            <Input
              autoFocus
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="Digite a frase exata"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={phrase !== CONFIRMATION_PHRASE || wipeMutation.isPending}
              onClick={executeWipe}
            >
              {wipeMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Confirmar e executar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
