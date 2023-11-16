class ControllerError extends Error {
    /**
     * @param {string} code
     * @param {string} message
     * @param {number} statusCode
     * @param {Object} options
     */
    constructor (code, message, statusCode = null, options = null) {
        super(message, options)

        this.name = 'ControllerError'

        this.code = code
        this.error = message

        if (statusCode) {
            this.statusCode = statusCode
        }
    }
}

module.exports = {
    ControllerError
}
