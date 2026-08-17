import { defineConfig } from 'drizzle-kit';

/**
 * Migrations are generated locally and committed. They are applied to D1 with
 * `wrangler d1 migrations apply`; see docs/ARCHITECTURE.md.
 */
export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: './src/schema.ts',
  out: './migrations',
  strict: true,
  verbose: true,
});
