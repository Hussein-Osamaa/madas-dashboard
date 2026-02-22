# ================================
# Stage 1: Build
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (deterministic; requires in-sync package-lock.json)
COPY package.json package-lock.json ./
RUN npm ci

# Build app
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ================================
# Stage 2: Production
# ================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Production deps only (deterministic)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

# Built output only
COPY --from=builder /app/dist ./dist

# Runtime dirs (e.g. file uploads)
RUN mkdir -p uploads/reports

EXPOSE 4000

CMD ["node", "dist/index.js"]
