/**
 * Turn feedback helpers. Pure functions over the store's message list: no state.
 *
 * One logical turn can span several AI bubbles (approval resumes, plan approval,
 * question answers, notices), each with its own transaction id. The rating belongs
 * to the last AI bubble before the next human message, and is sent against that
 * bubble's transaction id.
 */

// A vote is sent against the bubble's transaction id, so a bubble the Expert never replied with can't take one.
function isRatable (message) {
    return message._type === 'ai' && !!message._transactionId
}

/**
 * Uuids of the AI messages that close a turn and can carry the rating row.
 * `isOpen` reports whether a message's turn is still running.
 */
export function getFeedbackMessageUuids (messages, { isOpen = () => false } = {}) {
    const uuids = new Set()
    let closing = null
    const close = () => {
        if (closing && isRatable(closing) && !isOpen(closing)) {
            uuids.add(closing._uuid)
        }
        closing = null
    }
    for (const message of messages) {
        if (message._type === 'human') {
            close()
        } else if (message._type === 'ai') {
            closing = message
        }
    }
    close()
    return uuids
}

const isChatItem = (item) => !item.kind || item.kind === 'chat'

function parseJson (data) {
    if (typeof data !== 'string') {
        return data
    }
    try {
        return JSON.parse(data)
    } catch {
        return data
    }
}

function serializeItem (item) {
    const readable = {}
    for (const [key, value] of Object.entries(item)) {
        if (key.startsWith('_') || key === 'seq') {
            continue
        }
        readable[key] = key === 'input' || key === 'output' ? parseJson(value) : value
    }
    return readable
}

function serializeAiMessage (message) {
    const items = Array.isArray(message.answer) ? message.answer : []
    const content = items
        .filter(item => (isChatItem(item) || item.kind === 'plan') && typeof item.content === 'string')
        .map(item => item.content)
        .join('\n\n')
    const entry = {
        role: 'assistant',
        timestamp: toIso(message._timestamp),
        content
    }
    const details = items
        .filter(item => !isChatItem(item) && item.kind !== 'plan')
        .map(serializeItem)
    if (details.length > 0) {
        entry.items = details
    }
    return entry
}

function toIso (timestamp) {
    return typeof timestamp === 'number' ? new Date(timestamp).toISOString() : null
}

/**
 * The conversation from the start up to and including the message with `uptoUuid`,
 * as plain JSON a person can read.
 * @return {Array<{ role: 'user' | 'assistant' | 'system' | 'event', timestamp: string | null, content: string, items?: object[] }>}
 */
export function serializeConversation (messages, uptoUuid) {
    const end = messages.findIndex(message => message._uuid === uptoUuid)
    const upto = end === -1 ? messages : messages.slice(0, end + 1)
    const conversation = []
    for (const message of upto) {
        switch (message._type) {
        case 'human':
            conversation.push({ role: 'user', timestamp: toIso(message._timestamp), content: message.content })
            break
        case 'ai':
            conversation.push(serializeAiMessage(message))
            break
        case 'system':
            conversation.push({ role: 'system', timestamp: toIso(message._timestamp), content: message.message })
            break
        case 'event':
            conversation.push({ role: 'event', timestamp: toIso(message._timestamp), content: message.kind, items: [serializeItem(message.payload || {})] })
            break
        default:
            // do nothing, unrecognized message
        }
    }
    return conversation
}
