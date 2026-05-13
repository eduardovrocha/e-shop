namespace :mailer do
  desc "Send a test email to verify SMTP configuration. Usage: rake mailer:test_smtp TO=admin@example.com"
  task test_smtp: :environment do
    to = ENV.fetch("TO") { abort "Usage: rake mailer:test_smtp TO=recipient@example.com" }

    unless ENV["SMTP_HOST"].present?
      abort "SMTP_HOST is not configured — set SMTP_* env vars before running this task"
    end

    mail = ActionMailer::Base.mail(
      to:      to,
      from:    ENV.fetch("SUPPORT_EMAIL", "noreply@example.com"),
      subject: "[Andrequicé] SMTP Test — #{Time.current.strftime('%Y-%m-%d %H:%M')}",
      body:    <<~TEXT
        Este email confirma que o SMTP está configurado corretamente.

        Host:   #{ENV.fetch('SMTP_HOST')}
        Port:   #{ENV.fetch('SMTP_PORT', '587')}
        Domain: #{ENV.fetch('SMTP_DOMAIN', ENV.fetch('SMTP_HOST'))}
        TLS:    #{ENV.fetch('SMTP_TLS', 'true')}

        Se você recebeu este email, o SMTP está funcionando.
      TEXT
    )
    mail.deliver_now!
    puts "✓ Email enviado com sucesso para #{to}"
  rescue Net::SMTPAuthenticationError => e
    abort "Falha de autenticação SMTP: #{e.message}"
  rescue Net::SMTPError => e
    abort "Erro SMTP: #{e.class} — #{e.message}"
  rescue => e
    abort "Erro inesperado: #{e.class} — #{e.message}"
  end
end
