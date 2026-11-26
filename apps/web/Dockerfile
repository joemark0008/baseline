# syntax=docker/dockerfile:1
# Build from the repository root:  docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://... .
FROM node:22-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false
ARG VITE_API_URL
ARG VITE_ENABLE_GOOGLE_AUTH=false
ENV VITE_API_URL=$VITE_API_URL VITE_ENABLE_GOOGLE_AUTH=$VITE_ENABLE_GOOGLE_AUTH
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/web --include-workspace-root --ignore-scripts
COPY apps/api/schema.graphql apps/api/schema.graphql
COPY apps/web apps/web
RUN npm run build -w apps/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1/health >/dev/null || exit 1
