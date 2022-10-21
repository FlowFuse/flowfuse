export default function (url, cursor, limit, query) {
    const queryString = new URLSearchParams()
    if (cursor) {
        queryString.append('cursor', cursor)
    }
    if (limit) {
        queryString.append('limit', limit)
    }
    if (query) {
        queryString.append('query', query)
    }
    const qs = queryString.toString()
    if (qs === '') {
        return url
    }
    return `${url}?${qs}`
}
