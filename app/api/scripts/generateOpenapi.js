/**
 * Generate the OpenAPI 3.1 spec from the live route schemas and write it to
 * handoffs/E1/openapi.yaml. No database or Redis is required — an ioredis-mock
 * stands in so the app can be built for introspection only.
 *
 * Usage: node scripts/generateOpenapi.js [outputPath]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import RedisMock from 'ioredis-mock';
import { buildApp } from '../src/app.js';

async function main() {
  const out =
    process.argv[2] ||
    resolve(process.cwd(), '../../handoffs/E1/openapi.yaml');

  const app = await buildApp({ redis: new RedisMock() });
  const yaml = app.swagger({ yaml: true });

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, yaml, 'utf8');
  await app.close();

  // eslint-disable-next-line no-console
  console.log('OpenAPI 3.1 spec written to', out);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('OpenAPI generation failed:', e);
  process.exit(1);
});
