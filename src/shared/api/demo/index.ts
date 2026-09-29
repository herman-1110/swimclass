import type { Transaction } from '@electric-sql/pglite'

import type { Backend } from '../backend'
import { AppError } from '../rpc'
import {
  demoAdminAccounts,
  demoGetSession,
  demoLogIn,
  demoSignUp,
  demoUpdatePassword,
} from './accounts'
import { demoDb, resetDemoData } from './db'
import { onDemoSessionChange, setDemoSession } from './session'
import {
  callSql,
  columnsOf,
  deleteSql,
  DemoRequestError,
  functionShapes,
  hasCondition,
  insertSql,
  pickFunction,
  readSql,
  updateSql,
} from './sql'

// Demo mode's backend (see ./db.ts): every call runs in a transaction as the signed-in
// account, or anon when signed out, with RLS and grants applied, the way the Supabase
// API runs a request.

export { resetDemoData }

async function asCaller<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  const db = await demoDb()
  const session = await demoGetSession(db)
  return db.transaction(async (tx) => {
    const claims = session ? { sub: session.userId, role: 'authenticated' } : { role: 'anon' }
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(claims)])
    await tx.exec(`set local role ${session ? 'authenticated' : 'anon'}`)
    return work(tx)
  })
}

async function firstValue(tx: Transaction, sql: string, params: unknown[]): Promise<unknown> {
  const { rows } = await tx.query<{ v: unknown }>(sql, params)
  return rows[0]?.v ?? null
}

export function createDemoBackend(): Backend {
  return {
    async rpc(fn, args) {
      const db = await demoDb()
      const given = Object.keys(args).filter((k) => args[k] !== undefined)
      const shape = pickFunction(await functionShapes(db), fn, given)
      const sql = callSql(fn, shape, given)
      const value = await asCaller((tx) =>
        firstValue(tx, sql, given.length ? [JSON.stringify(args)] : []),
      )
      return shape.returns === 'void' ? null : value
    },

    async read(source, query) {
      const db = await demoDb()
      const columns = await columnsOf(db, source)
      const params: unknown[] = []
      const sql = readSql(source, query, columns, params)
      return (await asCaller((tx) => firstValue(tx, sql, params))) as unknown[]
    },

    async insert(table, rows) {
      if (!rows.length) return
      const db = await demoDb()
      const sql = insertSql(table, rows, await columnsOf(db, table))
      await asCaller((tx) => tx.query(sql, [JSON.stringify(rows)]))
    },

    async update(table, values, filter) {
      if (!hasCondition(filter)) throw new DemoRequestError('An update needs a filter.')
      const db = await demoDb()
      const params: unknown[] = [JSON.stringify(values)]
      const sql = updateSql(table, values, filter, await columnsOf(db, table), params)
      await asCaller((tx) => tx.query(sql, params))
    },

    async remove(table, filter) {
      if (!hasCondition(filter)) throw new DemoRequestError('A delete needs a filter.')
      const db = await demoDb()
      const params: unknown[] = []
      const sql = deleteSql(table, filter, await columnsOf(db, table), params)
      await asCaller((tx) => tx.query(sql, params))
    },

    async edge(name, body) {
      const db = await demoDb()
      if (name === 'admin-accounts') return demoAdminAccounts(db, body)
      if (name === 'login') {
        const text = (value: unknown) => (typeof value === 'string' ? value : '')
        const session = await demoLogIn(db, text(body.username), text(body.password))
        return { user: { id: session.userId, email: session.email } }
      }
      throw new AppError('unknown')
    },

    auth: {
      getSession: async () => demoGetSession(await demoDb()),
      onChange: onDemoSessionChange,
      logIn: async (username, password) => demoLogIn(await demoDb(), username, password),
      signUp: async (input) => demoSignUp(await demoDb(), input),
      logOut: async () => {
        setDemoSession(null)
        await Promise.resolve()
      },
      // Demo mode can't send email; the reset page works for a signed-in demo account.
      sendPasswordReset: async () => {
        await Promise.resolve()
      },
      updatePassword: async (password) => demoUpdatePassword(await demoDb(), password),
    },
  }
}
