# ---- einvoicecheck.ae marketing site (Next.js App Router, standalone output) ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json next.config.mjs ./
COPY src ./src
COPY public ./public

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Waitlist stub store (TODO(E2): replace with a real datastore; container FS is ephemeral).
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
