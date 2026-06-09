# Build context must be the repository root.
# Example: docker build -f backend-ts/Dockerfile -t bilibili-pet-backend:latest .

# Stage 0: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV BUILD_OUT_DIR=/app/dist
RUN npm run build

# Stage 0b: Build companion surface
FROM node:20-alpine AS companion-builder
WORKDIR /app
COPY pet-companion-web/package*.json ./
RUN npm ci
COPY pet-companion-web/ ./
ENV BUILD_OUT_DIR=/app/dist
ENV BUILD_BASE=/companion/
RUN npm run build

# Stage 1: Build backend
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend-ts/package*.json ./
COPY backend-ts/prisma ./prisma/
RUN npm ci
COPY backend-ts/ ./
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
COPY backend-ts/package*.json ./
COPY backend-ts/prisma ./prisma/
COPY backend-ts/prisma.config.ts ./prisma.config.ts
COPY backend-ts/scripts ./scripts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=frontend-builder /app/dist ./public/admin
COPY --from=companion-builder /app/dist ./public/companion
COPY backend-ts/config ./config
ENV NODE_ENV=production
ENV PORT=3000
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1)})"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
