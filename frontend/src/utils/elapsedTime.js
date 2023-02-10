const reportTime = (s, v) => `${v} ${v !== 1 ? s + 's' : s}`

const periodSeconds = {
    years: 31536000,
    months: 2592000,
    weeks: 604800,
    days: 86400,
    hours: 3600,
    minutes: 60,
    seconds: 1
}

function dateDiff (to, from) {
    if (typeof from === 'string') {
        from = (new Date(from)).getTime()
    }

    let delta = Math.abs(to - from) / 1000

    const res = {}

    for (const key in periodSeconds) {
        res[key] = Math.floor(delta / periodSeconds[key])
        delta -= res[key] * periodSeconds[key]
    }

    return res
}

export default function (to, from) {
    const periods = dateDiff(to, from)

    const parts = []
    let fineGrained = true
    if (periods.years > 0) {
        parts.push(reportTime('year', periods.years))
        fineGrained = false
    }
    if (periods.months > 0) {
        parts.push(reportTime('month', periods.months))
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
