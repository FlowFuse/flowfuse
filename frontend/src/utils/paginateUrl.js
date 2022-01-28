export default function (url, cursor, limit) {
    const queryString = new URLSearchParams()
    if (cursor) {
        queryString.append('cursor', cursor)
    }
    if (limit) {
        queryString.append('limit', limit)
    }
    const qs = queryString.toString()
    if (qs === '') {
        return url
    }
    return `${url}?${qs}`
}
