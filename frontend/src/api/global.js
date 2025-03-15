import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

const search = (teamSlug, query) => {
    const url = paginateUrl('/api/v1/search', null, null, query, { team: teamSlug })
    return client.get(url)
        .then(res => res.data)
}

export default {
    search
}
