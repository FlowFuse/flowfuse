const SECOND = 1
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MONTH = 30 * DAY
const YEAR = 365 * DAY

const reportTime = (s, v) => `${v} ${v !== 1 ? s + 's' : s}`

export default function (delta) {
    delta /= 1000

    const periods = {

    }
    periods.years = Math.floor(delta / YEAR)
    if (periods.years > 0) {
        delta = delta % YEAR
    }

    periods.months = Math.floor(delta / MONTH)
    if (periods.months > 0) {
        delta = delta % MONTH
    }

    periods.days = Math.floor(delta / DAY)
    if (periods.days > 0) {
        delta = delta % DAY
    }

    periods.hours = Math.floor(delta / HOUR)
    if (periods.hours > 0) {
        delta = delta % HOUR
    }

    periods.minutes = Math.floor(delta / MINUTE)
    if (periods.minutes > 0) {
        delta = delta % MINUTE
    }

    periods.seconds = Math.floor(delta)

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
