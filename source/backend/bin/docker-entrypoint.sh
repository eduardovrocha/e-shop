#!/bin/bash
set -e

if [ -f /rails/tmp/pids/server.pid ]; then
  rm /rails/tmp/pids/server.pid
fi

# Instala gems no volume na primeira execução; usa cache nas demais.
bundle check 2>/dev/null || bundle install

exec "$@"
