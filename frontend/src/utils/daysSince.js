import elapsedTime from '@/utils/elapsedTime'

export default function (dateString) {
    if (!dateString) {
        return ''
    }

    return elapsedTime(Date.now(), dateString) + ' ago'
}
