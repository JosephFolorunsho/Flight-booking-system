# ============================================
# SkyRoute Backend - Multi-stage Dockerfile
# ============================================

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN npm ci --only=production 2>/dev/null || npm install --only=production

# Stage 2: Production
FROM node:18-alpine AS production

# Add non-root user for security
RUN addgroup -g 1001 -S skyroute && \
    adduser -S skyroute -u 1001

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY package.json ./
COPY src ./src

# Set ownership
RUN chown -R skyroute:skyroute /app

# Switch to non-root user
USER skyroute

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "src/server.js"]
