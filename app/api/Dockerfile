# ---- UAE e-invoice preflight validation API ----
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Build toolchain for native deps (libxmljs2 falls back to node-gyp when no
# prebuilt binary matches; node:22-alpine has no python/make/g++ by default).
RUN apk add --no-cache python3 make g++ libc6-compat

# Install production deps only (uses lockfile if present)
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# App source
COPY src ./src
COPY scripts ./scripts

# Runtime resources — fail-loud at module load if absent:
#   - schematron/*.sch               (Schematron interpreter compiles at import)
#   - pint-ae-resources/ubl-2.1/xsd  (XSD gate loads UBL 2.1 schema at import)
COPY schematron ./schematron
COPY pint-ae-resources ./pint-ae-resources

EXPOSE 3000

# Basic container healthcheck hits the readiness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
