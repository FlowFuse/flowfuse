type DateInput = string | number | Date

const reportTime = (s: string, v: number): string => `${v} ${v !== 1 ? s + 's' : s}`

const periodSeconds: Record<string, number> = {
    years: 31536000,
    months: 2592000,
    weeks: 604800,
    days: 86400,
    hours: 3600,
    minutes: 60,
    seconds: 1
}

function dateDiff (toStringDateOrNumber: DateInput, fromStringDateOrNumber: DateInput = new Date()): Record<string, number> {
    let to: DateInput = toStringDateOrNumber
    if (typeof to === 'string' || typeof to === 'number') {
        if (!isNaN(Number(to))) {
            to = Number.parseInt(String(to))
        }
        to = new Date(to)
    }

    let from: DateInput = fromStringDateOrNumber
    if (typeof from === 'string' || typeof from === 'number') {
        if (!isNaN(Number(from))) {
            from = Number.parseInt(String(from))
        }
        from = new Date(from)
    }

    if (!(to instanceof Date) || isNaN(to.getTime())) {
        throw new RangeError(`To date is required to be a valid ISO 8601 string, milliseconds since epoch or Date object, received ${toStringDateOrNumber}`)
    }

    if (!(from instanceof Date) || isNaN(from.getTime())) {
        throw new RangeError(`From date is required to be a valid ISO 8601 string, milliseconds since epoch or Date object, received ${fromStringDateOrNumber}`)
    }

    let delta = Math.abs(to.getTime() - from.getTime()) / 1000

    const res: Record<string, number> = {}

    for (const key in periodSeconds) {
        res[key] = Math.floor(delta / periodSeconds[key])
        delta -= res[key] * periodSeconds[key]
    }

    return res
}

export default function (to: DateInput, from?: DateInput): string {
    const periods = dateDiff(to, from)

    const parts: string[] = []
    let fineGrained = true
    if (periods.years > 0) {
        parts.push(reportTime('year', periods.years))
        fineGrained = false
    }
    if (periods.months > 0) {
        parts.push(reportTime('month', periods.months))
        fineGrained = false
    }
    if (periods.weeks > 0) {
        parts.push(reportTime('week', periods.weeks))
        fineGrained = false
    }
    if (periods.days > 0) {
        parts.push(reportTime('day', periods.days))
        fineGrained = false
    }

    if (fineGrained) {
        let superFineGrained = true
        if (periods.hours > 0) {
            parts.push(reportTime('hour', periods.hours))
            superFineGrained = false
        }
        if (periods.minutes > 0) {
            parts.push(reportTime('minute', periods.minutes))
        }
        if (superFineGrained && periods.seconds > 0) {
            parts.push(reportTime('second', periods.seconds))
        }
    }

    if (parts.length === 0) {
        // Not sure this can ever really happen
        return 'moments'
    }
    return parts.join(', ')
}
