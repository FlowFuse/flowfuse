export default function (url, cursor, limit, query, extraParams = {}) {
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
    if (extraParams) {
        for (const key in extraParams) {
            queryString.append(key, extraParams[key])
        }
    }
    const qs = queryString.toString()
    if (qs === '') {
        return url
    }
    return `${url}?${qs}`
}
