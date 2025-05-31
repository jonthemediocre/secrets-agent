# Multi-stage build for production-ready, secure container
FROM node:20-alpine AS base

# Install security updates and required packages
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        dumb-init \
        curl \
        ca-certificates && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S secrets-agent -u 1001

# Set working directory
WORKDIR /app

# Dependencies stage
FROM base AS deps

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with security audit
RUN npm ci --only=production --audit-level=moderate && \
    npm cache clean --force && \
    rm -rf ~/.npm

# Build stage
FROM base AS build

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev)
RUN npm ci --audit-level=moderate

# Copy source code
COPY . .

# Build application
RUN npm run build:prod && \
    npm run test:unit && \
    npm prune --production

# Production stage
FROM base AS production

# Set environment
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info \
    METRICS_ENABLED=true

# Copy built application
COPY --from=build --chown=secrets-agent:nodejs /app/dist ./dist
COPY --from=deps --chown=secrets-agent:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=secrets-agent:nodejs /app/package.json ./

# Copy configuration files
COPY --chown=secrets-agent:nodejs config/ ./config/

# Create necessary directories
RUN mkdir -p /app/logs /app/data /app/tmp && \
    chown -R secrets-agent:nodejs /app/logs /app/data /app/tmp

# Security hardening
RUN chmod -R 755 /app && \
    chmod -R 644 /app/config/ && \
    chmod +x /app/dist/cli/index.js

# Switch to non-root user
USER secrets-agent

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server/index.js"]

# Metadata
LABEL \
  org.opencontainers.image.title="Secrets Management Agent" \
  org.opencontainers.image.description="Secure secrets management with MCP bridge capabilities" \
  org.opencontainers.image.version="2.2.0" \
  org.opencontainers.image.authors="Secrets Management Team" \
  org.opencontainers.image.source="https://github.com/secrets-agent/secrets-management" \
  org.opencontainers.image.documentation="https://github.com/secrets-agent/secrets-management/blob/main/README.md" \
  org.opencontainers.image.licenses="MIT"