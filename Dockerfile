# Multi-stage Dockerfile for Secrets Agent production deployment

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client and build application
RUN npx prisma generate
RUN npm run build

# Stage 3: Runner (Production)
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy necessary files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Install production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]

# Metadata
LABEL \
  org.opencontainers.image.title="Secrets Management Agent" \
  org.opencontainers.image.description="Secure secrets management with MCP bridge capabilities" \
  org.opencontainers.image.version="2.2.0" \
  org.opencontainers.image.authors="Secrets Management Team" \
  org.opencontainers.image.source="https://github.com/secrets-agent/secrets-management" \
  org.opencontainers.image.documentation="https://github.com/secrets-agent/secrets-management/blob/main/README.md" \
  org.opencontainers.image.licenses="MIT"