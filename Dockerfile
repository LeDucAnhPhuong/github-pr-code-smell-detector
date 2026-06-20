# syntax=docker/dockerfile:1
#
# Multi-target image for the GitHub PR Code Smell Detector monorepo.
# Build context MUST be the monorepo root (.) because packages/web depends on
# the workspace package `github-pr-code-smell-detector` (packages/analyzer).
#
# Targets:
#   runner  -> slim Next.js standalone server (the web dashboard)         [default web]
#   worker  -> full image running the BullMQ worker / migrations (tsx)    [worker + migrate]
#
# Pin to Node 24 to match `engines` in package.json.

# ─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS base
# libc6-compat: glibc shim some native deps expect · openssl: Prisma needs it
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ─── builder: install deps, build analyzer, gen Prisma client, build Next ─────
FROM base AS builder
# Copy manifests first so `npm ci` is cached until dependencies change.
COPY package.json package-lock.json ./
COPY packages/analyzer/package.json packages/analyzer/package.json
COPY packages/web/package.json packages/web/package.json
# Full install (incl. workspace-local node_modules where npm chose not to hoist,
# e.g. analyzer's `shx`). Dev deps are needed to build.
RUN npm ci
COPY . .
RUN npm run build -w packages/analyzer \
 && npm run db:generate -w packages/web \
 && npm run build -w packages/web

# ─── runner: minimal runtime for the web dashboard ──────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone server (already contains a pruned node_modules traced from repo root).
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public
# Ensure the generated Prisma client ships even if file-tracing missed the engine.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER nextjs
EXPOSE 3000
# Standalone entry sits at packages/web/server.js when tracing root = repo root.
CMD ["node", "packages/web/server.js"]

# ─── worker: full image for the BullMQ worker AND prisma migrate deploy ──────
# Reuses the builder's full node_modules + compiled analyzer + Prisma client.
FROM base AS worker
ENV NODE_ENV=production
COPY --from=builder /app ./
# Default command runs the analysis worker; the `migrate` compose service
# overrides this with `npm run db:deploy -w packages/web`.
CMD ["npm", "run", "worker", "-w", "packages/web"]
