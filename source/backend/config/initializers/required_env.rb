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
  SUPPORT_EMAIL
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
else
  missing_prod = REQUIRED_IN_PRODUCTION.select { |k| ENV[k].blank? }
  if missing_prod.any?
    Rails.logger.warn(
      "[ENV] Variáveis não configuradas (obrigatórias em produção): #{missing_prod.join(', ')}"
    )
  end
end
