type LogLevel = 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

function redact(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value

    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: process.env.NODE_ENV === 'development' ? value.stack : undefined,
        }
    }

    if (Array.isArray(value)) return value.map(redact)

    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => {
            if (/token|secret|password|signature|authorization|key/i.test(key)) {
                return [key, '[redacted]']
            }
            return [key, redact(entry)]
        })
    )
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...redact(context) as LogContext,
    }

    const line = JSON.stringify(entry)
    if (level === 'error') {
        console.error(line)
    } else if (level === 'warn') {
        console.warn(line)
    } else {
        console.info(line)
    }
}

export const logger = {
    info(message: string, context?: LogContext) {
        write('info', message, context)
    },
    warn(message: string, context?: LogContext) {
        write('warn', message, context)
    },
    error(message: string, error?: unknown, context?: LogContext) {
        write('error', message, { ...context, error })
    },
}
