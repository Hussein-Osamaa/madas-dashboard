# ================================
# Stage 1: Build
# ================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install all deps (lockfile-strict install)
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ================================
# Stage 2: Production
# ================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Production deps only
COPY package.json package-lock.json ./
RUN npm install --omit=dev --frozen-lockfile \
    && npm cache clean --force

# Built output only
COPY --from=builder /app/dist ./dist

# Runtime dirs (e.g. file uploads)
RUN mkdir -p uploads/reports

EXPOSE 4000

CMD ["node", "dist/index.js"]
