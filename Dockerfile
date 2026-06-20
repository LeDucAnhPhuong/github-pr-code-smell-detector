# syntax=docker/dockerfile:1
#
# Multi-target image for the GitHub PR Code Smell Detector monorepo.
# Build context MUST be the monorepo root (.) because packages/dashboard depends on
# the workspace package `github-pr-code-smell-detector` (packages/analyzer).
#
# Targets:
#   runner         -> slim Next.js standalone server (the web dashboard)  [default web]
#   worker         -> full image: BullMQ worker / prisma migrate (tsx)    [worker + migrate]
#   landing-runner -> slim Next.js standalone server (the marketing site) [landing]
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
COPY packages/dashboard/package.json packages/dashboard/package.json
COPY packages/landing/package.json packages/landing/package.json
# Full install (incl. workspace-local node_modules where npm chose not to hoist,
# e.g. analyzer's `shx`). Dev deps are needed to build.
RUN npm ci
COPY . .
# NEXT_PUBLIC_* are inlined into the client bundle at BUILD time. For the landing
# site to link to the real dashboard in production, pass these as --build-arg.
# They default to empty (→ the landing's localhost fallbacks) for local builds.
ARG NEXT_PUBLIC_DASHBOARD_URL=""
ARG NEXT_PUBLIC_SITE_URL=""
ENV NEXT_PUBLIC_DASHBOARD_URL=${NEXT_PUBLIC_DASHBOARD_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
RUN npm run build -w packages/analyzer \
 && npm run db:generate -w packages/dashboard \
 && npm run build -w packages/dashboard \
 && npm run build -w packages/landing

# ─── runner: minimal runtime for the web dashboard ──────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone server (already contains a pruned node_modules traced from repo root).
COPY --from=builder /app/packages/dashboard/.next/standalone ./
COPY --from=builder /app/packages/dashboard/.next/static ./packages/dashboard/.next/static
COPY --from=builder /app/packages/dashboard/public ./packages/dashboard/public
# Ensure the generated Prisma client ships even if file-tracing missed the engine.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER nextjs
EXPOSE 3000
# Standalone entry sits at packages/dashboard/server.js when tracing root = repo root.
CMD ["node", "packages/dashboard/server.js"]

# ─── landing-runner: minimal runtime for the marketing landing site ─────────
FROM base AS landing-runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/packages/landing/.next/standalone ./
COPY --from=builder /app/packages/landing/.next/static ./packages/landing/.next/static
COPY --from=builder /app/packages/landing/public ./packages/landing/public

USER nextjs
EXPOSE 3000
# Standalone entry sits at packages/landing/server.js when tracing root = repo root.
CMD ["node", "packages/landing/server.js"]

# ─── worker: full image for the BullMQ worker AND prisma migrate deploy ──────
# Reuses the builder's full node_modules + compiled analyzer + Prisma client.
FROM base AS worker
ENV NODE_ENV=production
COPY --from=builder /app ./
# Default command runs the analysis worker; the `migrate` compose service
# overrides this with `npm run db:deploy -w packages/dashboard`.
CMD ["npm", "run", "worker", "-w", "packages/dashboard"]
