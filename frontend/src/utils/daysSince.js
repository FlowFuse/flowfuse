import elapsedTime from './elapsedTime.js'

export default function (dateString, shortenExtendedPeriods = false) {
    if (!dateString) {
        return ''
    }

    let fullElapsedTime = elapsedTime(Date.now(), dateString)

    if (shortenExtendedPeriods) {
        fullElapsedTime = fullElapsedTime.split(',').shift()
    }

    return fullElapsedTime + ' ago'
}
