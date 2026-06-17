/**
 * Abstract base class for platform action providers.
 * Implementations define supported actions and their handlers.
 */
class PlatformActionsInterface {
    /** @type {import('../../../forge').ForgeApplication} */
    app = null

    init (app) {
        this.app = app
    }

    get supportedActions () {
        throw new Error('supportedActions getter not implemented')
    }

    hasAction (actionName) {
        throw new Error('hasAction method not implemented')
    }

    /**
     * @param {string} actionName
     * @param {object} context
     * @param {object} [result]
     */
    async invokeAction (actionName, context, result = {}) {
        throw new Error('invokeAction method not implemented')
    }
}

module.exports = PlatformActionsInterface
