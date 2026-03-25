export function logInfo(message: string, meta?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level: 'info',
      message,
      meta,
      ts: new Date().toISOString(),
    })
  )
}

export function logError(message: string, error: unknown, meta?: Record<string, unknown>) {
  console.error(
    JSON.stringify({
      level: 'error',
      message,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
      meta,
      ts: new Date().toISOString(),
    })
  )
}