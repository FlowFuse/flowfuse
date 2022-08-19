import client from './client'
import paginateUrl from '@/utils/paginateUrl'
const marked = require('marked')

const getTeamTypes = async (cursor, limit, filter) => {
    let url = paginateUrl('/api/v1/team-types', cursor, limit)
    if (filter) {
        const queryString = new URLSearchParams()
        queryString.append('filter', filter)
        const qs = queryString.toString()
        if (!/\?/.test(url)) {
            url += '?'
        } else {
            url += '&'
        }
        url += qs
    }
    return client.get(url).then(res => {
        res.data.types = res.data.types.map(pt => {
            pt.value = pt.id
            pt.label = pt.name
            pt.htmlDescription = marked.parse(pt.description || '')
            pt.isFree = !pt.properties?.billing || pt.properties?.billing?.userCost === 0
            pt.billingPrice = pt.isFree ? 'free' : `$${pt.properties?.billing?.userCost}`
            return pt
        })
        return res.data
    })
}

export default {
    getTeamTypes
}
