/**
 * Generic in-memory nonce store.
 *
 * Each nonce is single-use (consumed on first read) and expires after a
 * configurable TTL. Callers attach arbitrary metadata when creating a nonce
 * and receive it back on consumption.
 *
 * In-memory only: intended for process-local trust boundaries such as
 * Fastify's app.inject(), where the producer and consumer always live in
 * the same Node.js process.
 *
 * Registered as a Fastify plugin on `app.nonceStore`.
 */

const crypto = require('crypto')

const fp = require('fastify-plugin')

const DEFAULT_TTL_MS = 30_000 // 30 seconds
const SWEEP_INTERVAL_MS = 60_000 // 1 minute

class NonceStore {
    constructor () {
        /** @type {Map<string, { metadata: object, expiresAt: number }>} */
        this._store = new Map()
        this._sweepTimer = setInterval(() => this._sweep(), SWEEP_INTERVAL_MS)
        this._sweepTimer.unref()
    }

    /**
     * Create a nonce and associate metadata with it.
     * @param {object} metadata - Arbitrary data returned on consume()
     * @param {number} [ttl] - Time-to-live in ms (default 30 000)
     * @returns {string} The nonce token
     */
    create (metadata, ttl = DEFAULT_TTL_MS) {
        const nonce = crypto.randomBytes(16).toString('hex')
        this._store.set(nonce, {
            metadata,
            expiresAt: Date.now() + ttl
        })
        return nonce
    }

    /**
     * Create a nonce for source context propagation.
     * Validates that source is present. Generates a correlationId if not provided.
     * @param {{ source: string, correlationId?: string, toolName?: string, tokenId?: number }} metadata
     * @param {number} [ttl] - Time-to-live in ms (default 30 000)
     * @returns {string} The nonce token
     */
    createSourceNonce (metadata, ttl) {
        if (!metadata?.source) {
            throw new Error('source is required for source context nonces')
        }
        const meta = { ...metadata }
        if (!meta.correlationId) {
            meta.correlationId = crypto.randomUUID()
        }
        return this.create(meta, ttl)
    }

    /**
     * Consume a nonce, returning its metadata exactly once.
     * Returns null if the nonce does not exist or has expired.
     * @param {string} nonce
     * @returns {object|null}
     */
    consume (nonce) {
        const entry = this._store.get(nonce)
        if (!entry) {
            return null
        }
        this._store.delete(nonce)
        if (entry.expiresAt < Date.now()) {
            return null
        }
        return entry.metadata
    }

    /** Remove all expired entries. */
    _sweep () {
        const now = Date.now()
        for (const [key, entry] of this._store) {
            if (entry.expiresAt < now) {
                this._store.delete(key)
            }
        }
    }

    /** Stop the periodic sweep timer. */
    close () {
        clearInterval(this._sweepTimer)
        this._store.clear()
    }
}

module.exports = fp(async function (app) {
    const store = new NonceStore()
    app.decorate('nonceStore', store)
    app.addHook('onClose', () => store.close())
}, { name: 'app.nonceStore' })

module.exports.NonceStore = NonceStore
