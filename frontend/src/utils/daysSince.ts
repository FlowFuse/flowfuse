import elapsedTime from './elapsedTime.js'

import { Maybe } from '@/types/common/types'

export default function (dateString?: Maybe<string | number | Date>, shortenExtendedPeriods = false): string {
    if (!dateString) {
        return ''
    }

    let fullElapsedTime = elapsedTime(Date.now(), dateString)

    if (shortenExtendedPeriods) {
        fullElapsedTime = fullElapsedTime.split(',').shift()
    }

    return fullElapsedTime + ' ago'
}
