# @nodepress/db

Database layer for NodePress using Drizzle ORM.

## Migration Strategy

### Development

For local development, use `drizzle:push` for quick schema synchronization:

```bash
npm run drizzle:push
```

This directly synchronizes your schema without generating migration files.

### Production

For production deployments, migrations are generated and tracked in the repository:

1. **Generate migrations** after schema changes:

   ```bash
   npm run drizzle:generate
   ```

   This creates SQL files in `drizzle/` and updates `_journal.json`.

2. **Commit migrations** to the repository with your code changes.

3. **Apply migrations** to production databases:
   ```bash
   npm run migrate
   ```

This provides full auditability and recovery capabilities in production.

## Available Scripts

- `npm run build` — Compile TypeScript
- `npm test` — Run Vitest suite
- `npm run drizzle:generate` — Generate migration files from schema changes
- `npm run drizzle:push` — Sync schema directly (dev-only, no migration files)
- `npm run migrate` — Apply migrations to database
- `npm run seed` — Seed database with initial data
- `npm run reset` — Reset database to initial state

## Schema

Table definitions are in `src/schema/`:

- `posts.ts` — Blog posts and custom post types
- `users.ts` — User accounts and roles
- `comments.ts` — Post comments
- `terms.ts` — Categories and tags
- `options.ts` — Site options
- `plugin-registry.ts` — Plugin metadata

## Environment

Set `DATABASE_URL` in `.env` to point to your PostgreSQL database:

```
DATABASE_URL=postgresql://user:password@localhost:5432/nodepress
```
