import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'

declare global {
  var __tidbPool: Pool | undefined
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export function getDbPool(): Pool {
  if (!global.__tidbPool) {
    global.__tidbPool = mysql.createPool({
      host: requiredEnv('TIDB_HOST'),
      port: Number(process.env.TIDB_PORT ?? '4000'),
      user: requiredEnv('TIDB_USER'),
      password: requiredEnv('TIDB_PASSWORD'),
      database: requiredEnv('TIDB_DATABASE'),
      ssl: {
        rejectUnauthorized: true,
      },
      connectionLimit: 10,
      namedPlaceholders: true,
    })
  }

  return global.__tidbPool
}

export type DbRow = RowDataPacket
export type DbWriteResult = ResultSetHeader