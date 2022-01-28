import elapsedTime from '@/utils/elapsedTime'

export default function (dateString) {
    if (!dateString) {
        return ''
    }
    if (!dateString) {
        return ''
    }
    const now = Date.now()
    const d = new Date(dateString)
    const delta = now - d.getTime()

    return elapsedTime(delta) + ' ago'
}
