/**
 * In-process PostgreSQL (PGlite) with a minimal shim of the parts of Supabase
 * the migrations depend on: the anon/authenticated roles, auth.users, auth.uid()
 * and storage.buckets/objects. Lets us run the real migrations and exercise RLS
 * and SECURITY DEFINER functions as each client role.
 *
 * This does NOT emulate PostgREST, GoTrue or the Storage API themselves.
 */
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SHIM = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  email_confirmed_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

create schema storage;
create table storage.buckets (
  id text primary key, name text not null, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
grant select, insert, delete on storage.objects to authenticated;
`

export type Actor = { kind: 'anon' } | { kind: 'user'; id: string } | { kind: 'superuser' }

export class TestDb {
  private constructor(readonly pg: PGlite) {}

  static async create(): Promise<TestDb> {
    const pg = new PGlite()
    await pg.exec(SHIM)
    const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'supabase', 'migrations')
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      await pg.exec(readFileSync(join(dir, file), 'utf8'))
    }
    return new TestDb(pg)
  }

  private async become(actor: Actor) {
    await this.pg.exec('reset role')
    if (actor.kind === 'superuser') {
      await this.pg.query(`select set_config('request.jwt.claims', '', false)`)
      return
    }
    const claims = actor.kind === 'user' ? JSON.stringify({ sub: actor.id, role: 'authenticated' }) : JSON.stringify({ role: 'anon' })
    await this.pg.query(`select set_config('request.jwt.claims', $1, false)`, [claims])
    await this.pg.exec(actor.kind === 'user' ? 'set role authenticated' : 'set role anon')
  }

  /** Run a query as the given actor. */
  async q<T = Record<string, unknown>>(actor: Actor, sql: string, params: unknown[] = []): Promise<T[]> {
    await this.become(actor)
    try {
      const res = await this.pg.query<T>(sql, params)
      return res.rows
    } finally {
      await this.pg.exec('reset role')
    }
  }

  su<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
    return this.q<T>({ kind: 'superuser' }, sql, params)
  }

  async createUser(email: string, confirmed = true): Promise<Actor & { kind: 'user' }> {
    const [row] = await this.su<{ id: string }>(
      `insert into auth.users (email, email_confirmed_at) values ($1, ${confirmed ? 'now()' : 'null'}) returning id`,
      [email],
    )
    return { kind: 'user', id: row.id }
  }

  async uploadPhoto(owner: Actor & { kind: 'user' }, name?: string): Promise<string> {
    const path = name ?? `applications/${owner.id}/photo_${Math.random().toString(36).slice(2, 12)}.jpg`
    await this.q(owner, `insert into storage.objects (bucket_id, name, owner) values ('member-photos', $1, $2)`, [path, owner.id])
    return path
  }
}

export const ANON: Actor = { kind: 'anon' }
