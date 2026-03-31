/**
 * @typedef {{
 *  app: import('vue').App,
 *  store: import('vuex').Store,
 *  router: import('vue-router').Router,
 *  services?: Record<string, AppService|null>
 * }} ServiceContext
 */

/**
 * Minimal lifecycle contract for app services.
 * Intended to become a TypeScript interface during migration.
 * @typedef {Object} AppService
 * @property {string} name
 * @property {() => (void|Promise<void>)} [init]
 * @property {() => (void|Promise<void>)} [destroy]
 */

/**
 * Lightweight base class for shared lifecycle surface.
 */
export class BaseService {
    /**
     * @param {string} name
     */
    constructor (name) {
        this.name = name
    }

    init () {
        return undefined
    }

    async destroy () {
        return Promise.resolve()
    }
}
