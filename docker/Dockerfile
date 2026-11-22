# syntax=docker/dockerfile:1

# The toolchain image `pnpm build:ci` and `pnpm e2e` run inside on a
# developer's machine. See docs/adr/0003-builds-and-e2e-run-in-docker.md and
# e2e/AGENTS.md. It is never deployed: the site is built and hosted by Vercel.
#
# The Node version is handed in by the launcher, which reads it from
# mise.toml, so that file stays the only place it is declared.
ARG NODE_VERSION
FROM node:${NODE_VERSION}-bookworm-slim

# - MONGOMS_DISABLE_POSTINSTALL: mongodb-memory-server's postinstall downloads
#   a mongod binary; nothing in this image starts one (Mongo is its own
#   container).
# - HUSKY: there is no .git here for the `prepare` script to install hooks in.
ENV HUSKY=0 \
    MONGOMS_DISABLE_POSTINSTALL=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

WORKDIR /app

# Manifests first, so the install layer is rebuilt only when they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# pnpm at the version package.json's `packageManager` field names.
RUN npm install --global "$(node --print "require('./package.json').packageManager")"

RUN --mount=type=cache,id=mkelley33-pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Chromium and the system libraries it needs, at the version the lockfile's
# Playwright expects — the same command the CI `e2e` job runs.
RUN pnpm exec playwright install --with-deps chromium

# The working tree as .dockerignore filters it: no env files, no host
# node_modules, no host build output.
COPY . .
