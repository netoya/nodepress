# Database Seeding

## What the seed contains

| Entity     | Count | Details                                                                                           |
| ---------- | ----- | ------------------------------------------------------------------------------------------------- |
| Admin user | 1     | `admin@nodepress.local`, id=1, password_hash is a dev placeholder (Sprint 2 replaces with bcrypt) |
| Posts      | 5     | 3 published, 1 draft, 1 pending — all authored by admin user                                      |
| Options    | 3     | `siteurl`, `blogname`, `blogdescription`                                                          |

## How to run

```bash
npm run db:seed
```

This calls `tsx packages/db/src/seeds/index.ts`. Expected output:

```
✅ seeded 1 user, 5 posts, 3 options
```

The script is idempotent — running it multiple times does not duplicate data (`ON CONFLICT DO NOTHING` for users and posts, `ON CONFLICT DO UPDATE` for options).

## Reset to clean state

### Destructive reset (development only)

To truncate all tables and re-seed in one operation:

```bash
npm run demo:reset
```

This truncates the 7 tables in FK-safe order (`comments`, `term_relationships`, `posts`, `terms`, `options`, `plugin_registry`, `users`) and then runs the seed. Useful before:

- Recording demo video (prevents slug collisions)
- Manual testing that requires a clean DB
- Reproducing bugs from a known state

**Safety:** The script refuses to run with `NODE_ENV=production`.

### Full schema reset

If you want to wipe the database schema and re-seed from scratch:

```bash
npm run db:drizzle:push && npm run db:seed
```

`drizzle:push` syncs the schema (drops/recreates tables if needed). Follow with `db:seed` to populate with demo data.

## Environment

`DATABASE_URL` must be set. The seed script auto-loads `.env` from the repo root (same pattern as `packages/db/src/client.ts`). For local dev:

```bash
cp .env.example .env
# edit DATABASE_URL if needed
docker-compose up -d postgres
npm run db:seed
```
