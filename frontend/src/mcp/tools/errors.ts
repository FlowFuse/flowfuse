// Some thrown errors carry no message, only extra own properties, so fall back to
// those instead of losing the reason.
export function describeError (err: unknown): string {
    if (err instanceof Error) {
        if (err.message) {
            return err.message
        }
        const details = { ...err }
        return Object.keys(details).length
            ? `${err.name}: ${JSON.stringify(details)}`
            : err.name
    }
    if (typeof err === 'string' && err) {
        return err
    }
    return JSON.stringify(err) ?? 'Unknown error'
}
