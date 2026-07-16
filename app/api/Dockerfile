# ---- UAE e-invoice preflight validation API ----
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install production deps only (uses lockfile if present)
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# App source
COPY src ./src
COPY scripts ./scripts

EXPOSE 3000

# Basic container healthcheck hits the readiness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
