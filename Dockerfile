# Stage 1: build the React app
FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: API that also serves the built web app
FROM node:22-alpine
WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev
COPY api/tsconfig.json ./
COPY api/src ./src
COPY --from=web /web/dist ./public

ENV NODE_ENV=production \
    STATIC_DIR=/app/public \
    PORT=3000
USER node
EXPOSE 3000
CMD ["node_modules/.bin/tsx", "src/server.ts"]
