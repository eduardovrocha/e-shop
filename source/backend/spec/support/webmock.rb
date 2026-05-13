require "webmock/rspec"

# Bloqueia requisições HTTP reais em todos os testes.
# Use stub_request(...) para permitir chamadas específicas por teste.
WebMock.disable_net_connect!(allow_localhost: true)
