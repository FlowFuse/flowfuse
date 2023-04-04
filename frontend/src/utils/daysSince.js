import elapsedTime from './elapsedTime'

export default function (dateString) {
    if (!dateString) {
        return ''
    }

    return elapsedTime(Date.now(), dateString) + ' ago'
}
