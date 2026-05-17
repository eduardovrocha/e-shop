# Valida variáveis de ambiente obrigatórias na inicialização.
# Em produção falha imediatamente (fail-fast). Em dev/test registra aviso.

REQUIRED_IN_PRODUCTION = %w[
  JWT_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY
  ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY
  ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT
  HOST_URL
  FRONTEND_URL
  CORS_ORIGINS
].freeze

REQUIRED_ALWAYS = %w[
  POSTGRES_HOST
  REDIS_HOST
].freeze

missing_always = REQUIRED_ALWAYS.select { |k| ENV[k].blank? }
if missing_always.any?
  raise "Variáveis de ambiente obrigatórias ausentes: #{missing_always.join(', ')}"
end

if Rails.env.production?
  missing_prod = REQUIRED_IN_PRODUCTION.select { |k| ENV[k].blank? }
  if missing_prod.any?
    raise "Variáveis de ambiente de produção ausentes: #{missing_prod.join(', ')}. " \
          "Configure-as no servidor antes de iniciar a aplicação."
  end

  # HOST_URL deve apontar para a API, não para o frontend.
  # Erro comum: configurar HOST_URL=https://andrequice.store (frontend) em vez
  # de https://api.andrequice.store, fazendo Active Storage gerar URLs erradas.
  host_url = ENV.fetch("HOST_URL", "")
  unless host_url.include?("api.")
    raise "HOST_URL mal configurado: '#{host_url}'. " \
          "Em produção HOST_URL deve apontar para a API (ex: https://api.andrequice.store), " \
          "não para o frontend."
  end

  # FRONTEND_URL deve apontar para o domínio público da loja, não para a API.
  # Usado em links de rastreamento de pedido exibidos ao cliente (e-mail + dashboard).
  frontend_url = ENV.fetch("FRONTEND_URL", "")
  if frontend_url.include?("api.")
    raise "FRONTEND_URL mal configurado: '#{frontend_url}'. " \
          "FRONTEND_URL deve apontar para o frontend (ex: https://andrequice.store), " \
          "não para a API."
  end
else
  missing_prod = REQUIRED_IN_PRODUCTION.select { |k| ENV[k].blank? }
  if missing_prod.any?
    Rails.logger.warn(
      "[ENV] Variáveis não configuradas (obrigatórias em produção): #{missing_prod.join(', ')}"
    )
  end
end
