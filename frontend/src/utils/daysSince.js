import elapsedTime from './elapsedTime.js'

export default function (dateString) {
    if (!dateString) {
        return ''
    }

    return elapsedTime(Date.now(), dateString) + ' ago'
}
