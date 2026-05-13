class BruteForceProtection
  MAX_ATTEMPTS  = 5
  LOCKOUT_TTL   = 15.minutes.to_i  # segundos
  ATTEMPTS_TTL  = 30.minutes.to_i  # janela de contagem

  # Verifica se o identificador está bloqueado.
  def self.locked?(identifier)
    new(identifier).locked?
  end

  # Retorna segundos restantes de bloqueio (0 se não bloqueado).
  def self.ttl(identifier)
    new(identifier).ttl
  end

  # Registra uma tentativa falha. Bloqueia ao atingir MAX_ATTEMPTS.
  def self.record_failure(identifier)
    new(identifier).record_failure
  end

  # Limpa contagem e bloqueio (chamado após login bem-sucedido).
  def self.reset(identifier)
    new(identifier).reset
  end

  def initialize(identifier)
    digest       = Digest::SHA256.hexdigest(identifier.to_s.strip.downcase)
    @attempts_key = "bfp:attempts:#{digest}"
    @locked_key   = "bfp:locked:#{digest}"
  end

  def locked?
    Sidekiq.redis { |r| r.call("EXISTS", @locked_key) > 0 }
  end

  def ttl
    [ Sidekiq.redis { |r| r.call("TTL", @locked_key) }, 0 ].max
  end

  def record_failure
    count = nil
    Sidekiq.redis do |r|
      count = r.call("INCR", @attempts_key)
      r.call("EXPIRE", @attempts_key, ATTEMPTS_TTL) if count == 1

      if count >= MAX_ATTEMPTS
        r.call("SETEX", @locked_key, LOCKOUT_TTL, "1")
        r.call("DEL", @attempts_key)
      end
    end
    count
  end

  def reset
    Sidekiq.redis { |r| r.call("DEL", @attempts_key, @locked_key) }
  end
end
