# DEPLOY — UAE e-invoice preflight validation API (Railway)

Deploy runbook for the Fastify + MongoDB + Redis service in `app/api/`.
Everything below is **blocked on G2 credentials** (no Railway account, no live
Mongo/Redis in the build session). Run these once credentials exist.

The repo is deploy-ready: `Dockerfile`, `railway.json`, `.env.example`, and a
`seed:key` script are all present.

---

## 0. Prerequisites (one-time)
- A Railway account + `railway` CLI: `npm i -g @railway/cli` then `railway login`.
- Decide on managed data stores:
  - **MongoDB** — Railway MongoDB plugin, or MongoDB Atlas (recommended for prod).
  - **Redis** — Railway Redis plugin.

## 1. Create / link the project
```bash
cd app/api
railway init          # or: railway link  (to attach to an existing project)
```

## 2. Provision data stores
```bash
# In the Railway dashboard, add a MongoDB and a Redis service to the project,
# OR use Atlas and copy its SRV connection string.
```

## 3. Set environment variables
Every variable the service reads (see `.env.example`):
```bash
railway variables \
  --set "PORT=3000" \
  --set "HOST=0.0.0.0" \
  --set "NODE_ENV=production" \
  --set "LOG_LEVEL=info" \
  --set "MONGODB_URI=${MONGODB_URI}" \
  --set "REDIS_URL=${REDIS_URL}" \
  --set "RATE_LIMIT_MAX=60" \
  --set "RATE_LIMIT_WINDOW_MS=60000"
```
On Railway, reference the plugin-provided values, e.g.
`MONGODB_URI=${{MongoDB.MONGO_URL}}` and `REDIS_URL=${{Redis.REDIS_URL}}`
(exact names depend on the plugins you add).

## 4. Deploy
`railway.json` pins the Dockerfile builder and a `/health` healthcheck.
```bash
railway up
```
Railway builds `Dockerfile`, starts `node src/server.js`, and gates traffic on
`GET /health` (returns 200 only when Mongo + Redis are reachable).

## 5. Seed a demo API key (required for an authenticated call)
The raw key is printed **once** — capture it immediately. Run against the
deployed Mongo:
```bash
# One-off, using the same MONGODB_URI as the service:
railway run node scripts/seedApiKey.js "Demo Key" 120
#   -> prints:  RAW KEY : pdk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
(`120` = rate limit per minute for this key; omit for the global default of 60.)

## 6. Smoke-test the live service
```bash
BASE=https://<your-service>.up.railway.app
KEY=pdk_live_...

# readiness
curl -s "$BASE/health" | jq

# authenticated happy-path validation
curl -s "$BASE/v1/validate" \
  -H "x-api-key: $KEY" -H "content-type: application/json" \
  --data-binary @- <<'JSON' | jq
{
  "invoiceType":"388","invoiceNumber":"INV-2026-0001","issueDate":"2026-07-14",
  "currency":"AED",
  "supplier":{"trn":"100123456700003","name":"Falcon Trading LLC"},
  "customer":{"trn":"100987654300003","name":"Oasis Retail FZE"},
  "lines":[{"id":"1","quantity":10,"unitPrice":50,"lineExtensionAmount":500,"taxCategory":{"code":"S","rate":5}},
           {"id":"2","quantity":4,"unitPrice":25,"lineExtensionAmount":100,"taxCategory":{"code":"S","rate":5}}],
  "taxSubtotals":[{"taxableAmount":600,"taxAmount":30,"category":{"code":"S","rate":5}}],
  "totals":{"lineExtensionAmount":600,"taxExclusiveAmount":600,"taxAmount":30,"taxInclusiveAmount":630,"payableAmount":630}
}
JSON

# usage metering for the key
curl -s "$BASE/usage" -H "x-api-key: $KEY" | jq
```
Expected: `/health` → `{"status":"ok",...}`; `/v1/validate` →
`{"valid":true,"invoiceType":"388",...}`; `/usage` → non-zero totals.

## 7. Done-when (live)
- `GET /health` returns 200 with Mongo + Redis `up`.
- An authenticated `POST /v1/validate` with the seeded key returns
  `valid:true` for the sample above and `valid:false` (with cited errors) for a
  broken one.
- Record the resulting Railway URL back into `staging_url.txt`.

## Rollback
```bash
railway status                 # list deployments
railway rollback               # revert to the previous successful deploy
```
