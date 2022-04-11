import moment from 'moment'

// const SECOND = 1
// const MINUTE = 60 * SECOND
// const HOUR = 60 * MINUTE
// const DAY = 24 * HOUR
// const MONTH = 30 * DAY
// const YEAR = 365 * DAY
const reportTime = (s, v) => `${v} ${v !== 1 ? s + 's' : s}`

export default function (to, from) {
    const toDate = moment(to)
    const fromDate = moment(from)
    const years = toDate.diff(fromDate, 'years')
    fromDate.add(years, 'years')
    const months = toDate.diff(fromDate, 'months')
    fromDate.add(months, 'months')
    const days = toDate.diff(fromDate, 'days')
    fromDate.add(days, 'days')
    const hours = toDate.diff(fromDate, 'hours')
    fromDate.add(hours, 'hours')
    const minutes = toDate.diff(fromDate, 'minutes')
    fromDate.add(minutes, 'minutes')
    const seconds = toDate.diff(fromDate, 'seconds')
    const periods = {
        years,
        months,
        days,
        hours,
        minutes,
        seconds
    }
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
