class ApplicationMailer < ActionMailer::Base
  default from: Rails.application.credentials.dig(:mail, :from)
  layout "mailer"
end
