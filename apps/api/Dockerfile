# syntax=docker/dockerfile:1
# Build from the repository root:  docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/api --include-workspace-root --ignore-scripts
COPY apps/api apps/api
RUN npm run db:generate -w apps/api && npm run build -w apps/api

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001 NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/api --omit=dev --ignore-scripts && npm cache clean --force
# --ignore-scripts skipped Prisma's engine download; fetch it now as root so the runtime user never writes to node_modules.
RUN cd apps/api && npx prisma --version >/dev/null && rm -rf /root/.cache /root/.npm
ENV CHECKPOINT_DISABLE=1
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
WORKDIR /app/apps/api
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health >/dev/null || exit 1
CMD ["npm", "run", "start:prod"]
