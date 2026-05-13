ARG RUBY_VERSION=3.4.4
FROM ruby:${RUBY_VERSION}-slim

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
      build-essential \
      curl \
      git \
      libpq-dev \
      libyaml-dev \
      libvips-dev \
      pkg-config \
    && rm -rf /var/lib/apt/lists/*

ARG UID=1000
ARG GID=1000

RUN groupadd --system --gid ${GID} rails 2>/dev/null || true && \
    useradd rails --uid ${UID} --gid ${GID} --create-home --shell /bin/bash 2>/dev/null || true

WORKDIR /rails

ENV RAILS_ENV=development \
    BUNDLE_PATH=/home/rails/bundle

COPY source/backend/ .

# /home/rails/bundle é o mount point do volume bundle_cache.
# Precisa existir e ser owned pelo rails user antes do mount para que
# o volume seja inicializado vazio com as permissões corretas.
RUN chown -R rails:rails /rails && \
    mkdir -p /home/rails/bundle && \
    chown rails:rails /home/rails/bundle

USER rails

EXPOSE 3000

ENTRYPOINT ["/rails/bin/docker-entrypoint.sh"]
CMD ["./bin/rails", "server", "-b", "0.0.0.0"]
