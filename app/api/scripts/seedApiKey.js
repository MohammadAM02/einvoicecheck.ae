/**
 * Seed a demo API key. Prints the raw key exactly once — store it now, it is
 * never recoverable (only its SHA-256 hash is persisted).
 *
 * Usage:
 *   node scripts/seedApiKey.js "Demo Key" [rateLimitPerMinute]
 *   MONGODB_URI=... node scripts/seedApiKey.js "CI Key" 120
 */
import { connectMongo, disconnectMongo } from '../src/db/mongoose.js';
import { ApiKey } from '../src/models/ApiKey.js';

async function main() {
  const name = process.argv[2] || 'Demo Key';
  const rpm = process.argv[3] ? Number(process.argv[3]) : null;

  await connectMongo();
  const { raw, doc } = ApiKey.generate({ name, rateLimitPerMinute: rpm });
  const created = await ApiKey.create(doc);

  // eslint-disable-next-line no-console
  console.log('\n=== API key created ===');
  console.log('name        :', created.name);
  console.log('id          :', String(created._id));
  console.log('rateLimit/m :', created.rateLimitPerMinute ?? '(global default)');
  console.log('RAW KEY     :', raw);
  console.log('\nUse it as:  x-api-key: ' + raw);
  console.log('        or  Authorization: Bearer ' + raw);
  console.log('Store it now — it will not be shown again.\n');

  await disconnectMongo();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', e);
  process.exit(1);
});
