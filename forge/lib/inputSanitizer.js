/**
 * Input Sanitizer - Prevents chat injection attacks
 *
 * This module provides utilities to sanitize user input before sending
 * to the Expert AI service, preventing prompt injection and other attacks.
 *
 * @module inputSanitizer
 */

/**
 * Patterns that indicate potential prompt injection attempts
 */
const DANGEROUS_PATTERNS = [
    // Direct instruction manipulation
    /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|commands?|rules?)/gi,
    /forget\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|commands?|rules?)/gi,
    /disregard\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|commands?|rules?)/gi,

    // System role manipulation
    /system\s*:\s*/gi,
    /\[system\]/gi,
    /<\|system\|>/gi,
    /###\s*system/gi,
    /you\s+are\s+now\s+(a|an)\s+/gi,
    /new\s+instructions?\s*:/gi,
    /override\s+(previous|prior|default)\s+/gi,

    // Special tokens commonly used in LLMs
    /<\|.*?\|>/g,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<s>/gi,
    /<\/s>/gi,

    // Jailbreak attempts
    /do\s+anything\s+now/gi,
    /DAN\s+mode/gi,
    /developer\s+mode/gi,
    /god\s+mode/gi,

    // Encoding tricks to bypass filters
    /&#x?[0-9a-f]+;/gi, // HTML entities
    /\\u[0-9a-f]{4}/gi, // Unicode escapes
    /\\x[0-9a-f]{2}/gi // Hex escapes
]

/**
 * Maximum allowed lengths for different input types
 */
const MAX_LENGTHS = {
    QUERY: 5000,
    HISTORY_ITEM_QUERY: 10000,
    HISTORY_TOTAL: 50
}

/**
 * Sanitize a single text input
 * @param {string} input - The text to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized text
 */
function sanitizeText (input, maxLength = MAX_LENGTHS.QUERY) {
    if (!input || typeof input !== 'string') {
        return ''
    }

    let cleaned = input

    // Filter dangerous patterns
    DANGEROUS_PATTERNS.forEach(pattern => {
        if (pattern.test(cleaned)) {
            // Replace with placeholder instead of removing entirely
            // This allows legitimate text that might match to still be partially preserved
            cleaned = cleaned.replace(pattern, '[CONTENT_FILTERED]')
        }
    })

    // Normalize whitespace
    cleaned = cleaned
        .replace(/\s+/g, ' ') // Multiple spaces to single
        .replace(/[\r\n]{3,}/g, '\n\n') // Limit newlines
        .trim()

    // Enforce length limit
    if (cleaned.length > maxLength) {
        cleaned = cleaned.slice(0, maxLength) + '...'
    }

    return cleaned
}

/**
 * Sanitize query string
 * @param {string} query - The user query
 * @returns {string} - Sanitized query
 */
function sanitizeQuery (query) {
    return sanitizeText(query, MAX_LENGTHS.QUERY)
}

/**
 * Sanitize history array
 * @param {Array} history - Array of conversation history items
 * @returns {Array} - Sanitized history array
 */
function sanitizeHistory (history) {
    if (!Array.isArray(history)) {
        return []
    }

    // Limit history size
    const limitedHistory = history.slice(-MAX_LENGTHS.HISTORY_TOTAL)

    return limitedHistory.map(item => {
        if (!item || typeof item !== 'object') {
            return null
        }

        const sanitized = {}

        // Sanitize query field
        if (item.query && typeof item.query === 'string') {
            sanitized.query = sanitizeText(item.query, MAX_LENGTHS.HISTORY_ITEM_QUERY)
        }

        // Keep answer field but validate structure
        if (item.answer && Array.isArray(item.answer)) {
            sanitized.answer = item.answer.filter(ans =>
                ans &&
                typeof ans === 'object' &&
                ans.kind &&
                typeof ans.kind === 'string'
            )
        }

        return sanitized
    }).filter(item => item !== null && item.query) // Remove invalid items
}

/**
 * Sanitize context object
 * @param {Object} context - Context object containing user/team/instance info
 * @returns {Object} - Sanitized context object
 */
function sanitizeContext (context) {
    if (!context || typeof context !== 'object') {
        return {}
    }

    // Whitelist of allowed context fields
    const allowedFields = [
        'userId',
        'teamId',
        'teamSlug',
        'instanceId',
        'deviceId',
        'applicationId',
        'isTrialAccount',
        'pageName',
        'scope'
    ]

    const sanitized = {}

    allowedFields.forEach(field => {
        if (context[field] !== undefined) {
            const value = context[field]

            // Validate types
            if (typeof value === 'string' || typeof value === 'boolean') {
                sanitized[field] = value
            } else if (value === null) {
                sanitized[field] = null
            }
        }
    })

    // Special handling for rawRoute - only keep safe fields
    if (context.rawRoute && typeof context.rawRoute === 'object') {
        sanitized.rawRoute = {
            name: context.rawRoute.name,
            path: context.rawRoute.path,
            params: context.rawRoute.params,
            query: context.rawRoute.query
        }
    }

    return sanitized
}

/**
 * Detect suspicious patterns that might indicate injection attempts
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of detected pattern matches
 */
function detectSuspiciousPatterns (text) {
    if (!text || typeof text !== 'string') {
        return []
    }

    const detected = []

    DANGEROUS_PATTERNS.forEach((pattern, index) => {
        const matches = text.match(pattern)
        if (matches) {
            detected.push({
                patternIndex: index,
                matches,
                pattern: pattern.source
            })
        }
    })

    return detected
}

/**
 * Main sanitization function - sanitizes all expert API inputs
 * @param {Object} input - Raw input object from request
 * @returns {Object} - Sanitized input object with detection results
 */
function sanitizeExpertInput (input) {
    const { query, history, context } = input

    // Sanitize each component
    const sanitizedQuery = query ? sanitizeQuery(query) : ''
    const sanitizedHistory = history ? sanitizeHistory(history) : []
    const sanitizedContext = sanitizeContext(context)

    // Detect suspicious patterns for logging
    const suspiciousInQuery = query ? detectSuspiciousPatterns(query) : []
    const suspiciousInHistory = history
        ? history.flatMap((item, idx) =>
            item?.query ? detectSuspiciousPatterns(item.query).map(s => ({ ...s, historyIndex: idx })) : []
        )
        : []

    return {
        sanitized: {
            query: sanitizedQuery,
            history: sanitizedHistory,
            context: sanitizedContext
        },
        suspicious: {
            foundInQuery: suspiciousInQuery,
            foundInHistory: suspiciousInHistory,
            hasSuspiciousContent: suspiciousInQuery.length > 0 || suspiciousInHistory.length > 0
        }
    }
}

module.exports = {
    sanitizeText,
    sanitizeQuery,
    sanitizeHistory,
    sanitizeContext,
    sanitizeExpertInput,
    detectSuspiciousPatterns,
    MAX_LENGTHS,
    DANGEROUS_PATTERNS
}
