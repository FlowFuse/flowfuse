/**
 * Rate limiting for the server end points
 * `getLimits` returns the rate limit configuration object based on
 * settings in the config file under section `rate_limits`
 * @see https://github.com/fastify/fastify-rate-limit or the intellisense completions for additional options
 * @namespace routes
 * @memberof forge
 */

module.exports = {
    getLimits
}

/**
 * @typedef {Object} RLExtra - additional options for rate-limit
 * @property {Boolean} enabled - enable rate limiting
 * @property {Number} [maxAnonymous] - max requests per window for anonymous users (optional)
 *
 * @typedef {import('@fastify/rate-limit').RateLimitPluginOptions & RLExtra} RateLimitConfig
 * @typedef {import('forge/forge').ForgeApplication} ForgeApplication
 */

/**
 * @typedef RateLimitConfig2
 * @type {Object}
 * @augments RateLimitConfig
 * @property {Number} value
 */

/**
 * Prepare configuration settings for the rate-limit plugin
 * @param {ForgeApplication} app The app object
 * @param {RateLimitConfig} configLimits The rate-limit plugin options
 * @returns {RateLimitConfig | false}
 */
function getLimits (app, configLimits) {
    if (!configLimits || !configLimits.enabled) {
        return false
    }

    /** @type {RateLimitConfig} */
    const defaults = {
        global: true, // default to rate limiting all routes (except those explicitly excluded by `{ config { rateLimit: false } }`)
        timeWindow: '1 minute', // default window - 1 minute
        max: 1000 // max requests per window
        // maxAnonymous: 60 // max requests per window for anonymous users
    }

    /** @type {RateLimitConfig} */
    const limits = Object.assign({}, defaults, configLimits || {})

    // if settings specify `maxAnonymous`, setup a dynamic max function.
    // Essentially, if the user is not logged in, use the maxAnonymous value
    // otherwise use the max value
    // e.g: maxAnonymous: 10, max: 100
    //      if user is not logged in, max = 10
    //      if user is logged in, max = 100
    if (typeof limits.max !== 'function' && typeof limits.maxAnonymous === 'number' && limits.maxAnonymous > 0) {
        const _max = typeof limits.max === 'number' && limits.max > 0 ? limits.max : defaults.max
        limits.max = (request) => {
            if (!request || !request.sid) {
                return limits.maxAnonymous
            }
            return _max
        }
    }

    // setup the key generator for per-visitor rate limiting
    limits.keyGenerator = limits.keyGenerator || function (request) {
        return request.sid || request.headers['x-real-ip'] || request.headers['x-forwarded-for'] || request.ip
    }

    // log rate limit exceeded
    limits.onExceeded = limits.onExceeded || function (req, key) {
        app?.log?.warn?.(`Rate limit exceeded for '${key}' on ${req.raw.url}`)
    }

    return limits
}
