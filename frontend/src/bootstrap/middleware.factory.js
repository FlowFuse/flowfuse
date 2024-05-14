import nearestWithMiddleware from '../middleware/nearest-with.middleware.js'
import postHogMiddleware from '../middleware/post-hog.middleware.js'

import nextFactory from './next.factory.js'

export default (router) => function middlewareFactory (to, from, next) {
    const globalMiddleware = [
        postHogMiddleware,
        nearestWithMiddleware
    ]

    const hasRouteMiddleware = Object.prototype.hasOwnProperty.call(to.meta, 'middleware')

    if (globalMiddleware.length || hasRouteMiddleware) {
        let routeMiddleware = []
        if (hasRouteMiddleware) {
            if (Array.isArray(to.meta.middleware)) {
                routeMiddleware = to.meta.middleware
            } else {
                routeMiddleware = [to.meta.middleware]
            }
        }

        const middleware = [...globalMiddleware, ...routeMiddleware]

        const context = {
            from,
            next,
            router,
            to
        }
        const nextMiddleware = nextFactory(context, middleware, 1)

        return middleware[0]({ ...context, next: nextMiddleware })
    }

    return next()
}
