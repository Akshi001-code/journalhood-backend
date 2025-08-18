# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20.15.1

FROM node:${NODE_VERSION}-slim AS base
ENV NODE_ENV=production \
    NPM_CONFIG_CACHE=/root/.npm
WORKDIR /app

# Install full deps (incl. dev) in a separate stage to build TypeScript
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=journalhood-npm-cache,target=/root/.npm npm ci --include=dev

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Use npm cache dir, DO NOT mount anything inside node_modules
RUN --mount=type=cache,id=journalhood-npm-cache,target=/root/.npm npm run build

# Install only production deps for runtime image
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=journalhood-npm-cache,target=/root/.npm npm ci --omit=dev

FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

EXPOSE 8080
CMD ["node", "dist/index.js"]


