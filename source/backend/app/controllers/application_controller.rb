class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActiveStorage::SetCurrent

  before_action :apply_public_host_url

  # Deve ser público — url_for chama url_options de fora do controller.
  def url_options
    return super unless @_host_url_options
    super.merge(@_host_url_options)
  end

  private

  # Força todas as URLs geradas pelo Rails a usar o HOST_URL público
  # (ex: http://192.168.100.81) em vez do Host header recebido, que pode
  # ser "backend:3000" quando a requisição passa pelo Vite proxy.
  def apply_public_host_url
    host_url = ENV["HOST_URL"].presence
    return unless host_url

    parts   = host_url.sub(%r{\Ahttps?://}, "").split(":")
    options = {
      host:     parts[0],
      port:     parts[1]&.to_i.presence,
      protocol: host_url.start_with?("https") ? "https" : "http"
    }
    ActiveStorage::Current.url_options = options
    @_host_url_options = options
  end
end
