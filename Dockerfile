# syntax=docker/dockerfile:1

# ---- Dependencies ----
FROM node:22-alpine AS deps
WORKDIR /usr/src/app
# Quiet npm CLI noise (update-notifier / fund / audit / deprecation banners).
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_LOGLEVEL=error
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit --loglevel=error

# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /usr/src/app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_LOGLEVEL=error
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN npm run build \
  && npm prune --omit=dev --no-fund --no-audit --loglevel=error

# ---- Production runtime ----
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /usr/src/app

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4006/health || exit 1

USER nestjs

EXPOSE 4006

CMD ["node", "dist/main.js"]
