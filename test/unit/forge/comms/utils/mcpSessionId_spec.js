const should = require('should')

const FF_UTIL = require('flowforge-test-utils')

const { TOPIC_SAFE_SESSION_ID, toTopicSafeSessionId } = FF_UTIL.require('forge/comms/utils/mcpSessionId')

describe('MCP session id topic safety', function () {
    it('passes an already-safe id through untouched', function () {
        const uuid = '3f702f9d-47d1-4800-a92f-a86772c63559'
        toTopicSafeSessionId(uuid).should.equal(uuid)
        toTopicSafeSessionId('abc_123-XYZ').should.equal('abc_123-XYZ')
    })

    // OpenAI's clients send `v1/<token>` in _meta['openai/session']. Embedded raw it adds a
    // topic level, which matches no ACL pattern and is denied without an error.
    it('rewrites an id carrying an MQTT separator', function () {
        const openai = 'v1/3bjqKQlGRjpIMC9JfN8ZOLOI6XvwTstDuqZYmPAjNvBd9ZNRmU3NmyD4iT8CSJsVbFrSDHk0sSgz'
        const safe = toTopicSafeSessionId(openai)
        safe.should.not.containEql('/')
        safe.should.match(TOPIC_SAFE_SESSION_ID)
    })

    it('rewrites ids carrying MQTT wildcards', function () {
        toTopicSafeSessionId('abc+def123').should.match(TOPIC_SAFE_SESSION_ID)
        toTopicSafeSessionId('abc#def123').should.match(TOPIC_SAFE_SESSION_ID)
    })

    // A pinned tab is keyed by session id, so the same client must map to the same topic
    // on every request or its pin is unreachable by the next call.
    it('is stable for the same input', function () {
        const openai = 'v1/some-session-token'
        toTopicSafeSessionId(openai).should.equal(toTopicSafeSessionId(openai))
    })

    it('keeps distinct ids distinct', function () {
        toTopicSafeSessionId('v1/aaa').should.not.equal(toTopicSafeSessionId('v1/bbb'))
    })

    // The rewritten value is returned to the client, which may send it back to us
    it('is idempotent', function () {
        const once = toTopicSafeSessionId('v1/some-session-token')
        toTopicSafeSessionId(once).should.equal(once)
    })

    it('rejects a too-short or unusable id', function () {
        toTopicSafeSessionId('short').should.match(TOPIC_SAFE_SESSION_ID)
        should.not.exist(toTopicSafeSessionId(''))
        should.not.exist(toTopicSafeSessionId(null))
        should.not.exist(toTopicSafeSessionId(undefined))
    })
})
