const crypto = require('node:crypto')

/**
 * The shape an MCP session id must have to be usable as a single MQTT topic level.
 *
 * An allow-list rather than a list of characters to strip: the value arrives from a
 * third-party client, and an allow-list cannot be surprised by a separator nobody
 * thought of. '/' splits the topic into extra levels, '+' and '#' are wildcards, and
 * any of the three silently reshapes the topic so it matches no ACL pattern at all -
 * the publish is then denied without an error, which is indistinguishable from the
 * gateway simply never answering.
 */
const TOPIC_SAFE_SESSION_ID = /^[A-Za-z0-9_-]{8,128}$/

// Sentinel <userId> marking the session-less flow-building catalog fetch; the ACL treats
// this value alone as exempt from the third-party gate and the user lookup (see checkMcpTopic).
const FLOW_BUILDING_CATALOG_USER_ID = 'flow-building-tool-catalog'

/**
 * Returns a session id safe to embed as one level of an MQTT topic.
 *
 * Ids that already have the shape are passed through untouched, so a well-behaved
 * client's session id stays readable in logs and on the wire. Anything else is hashed
 * rather than stripped: stripping would collapse two distinct sessions onto one topic,
 * and the mapping has to stay stable or a client's pinned tab is lost between its own
 * requests.
 *
 * @param {string} sessionId The raw session id from the client
 * @returns {string|null} A topic-safe id, or null if there was nothing usable
 */
function toTopicSafeSessionId (sessionId) {
    if (typeof sessionId !== 'string' || sessionId.length === 0) {
        return null
    }
    if (TOPIC_SAFE_SESSION_ID.test(sessionId)) {
        return sessionId
    }
    return crypto.createHash('sha256').update(sessionId).digest('hex')
}

module.exports = { TOPIC_SAFE_SESSION_ID, FLOW_BUILDING_CATALOG_USER_ID, toTopicSafeSessionId }
