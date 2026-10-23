import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

const { Pool } = pg
const databaseUrl = String(process.env.DATABASE_URL || '').trim()

if (!databaseUrl) {
  console.log('DATABASE_URL is not set; skipping PostgreSQL migrations (memory mode).')
  process.exit(0)
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  max: 2,
})

const root = process.cwd()
const schemaPath = path.join(root, 'server', 'schema.sql')
const migrationsDir = path.join(root, 'server', 'migrations')

try {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(await fs.readFile(schemaPath, 'utf8'))
    await client.query('create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())')

    const files = (await fs.readdir(migrationsDir))
      .filter(name => /^\\d+_.+\\.sql$/.test(name))
      .sort()

    for (const file of files) {
      const already = await client.query('select 1 from schema_migrations where version=$1', [file])
      if (already.rowCount) continue
      await client.query(await fs.readFile(path.join(migrationsDir, file), 'utf8'))
      await client.query('insert into schema_migrations(version) values($1)', [file])
      console.log('Applied migration:', file)
    }

    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
} catch (error) {
  console.error('Database migration failed:', error.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
