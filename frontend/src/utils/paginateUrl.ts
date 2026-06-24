import { Maybe } from '@/types/common/types'

export default function (url: string, cursor?: Maybe<string>, limit?: number, query?: string, extraParams: Record<string, string | number> = {}): string {
    const queryString = new URLSearchParams()
    if (cursor) {
        queryString.append('cursor', cursor)
    }
    if (limit) {
        queryString.append('limit', String(limit))
    }
    if (query) {
        queryString.append('query', query)
    }
    if (extraParams) {
        for (const key in extraParams) {
            queryString.append(key, String(extraParams[key]))
        }
    }
    const qs = queryString.toString()
    if (qs === '') {
        return url
    }
    return `${url}?${qs}`
}
