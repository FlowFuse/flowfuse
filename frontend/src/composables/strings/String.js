import DOMPurify from 'dompurify'

export const isValidURL = (string) => {
    // eslint-disable-next-line
    return /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(string)
}

export const capitalize = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1)
}
/**
 * Conditionally pluralize a string
 * @param {String} stem the text to pluralize based on a count
 * @param {Number} count the value to pluralize for
 * @param {String} append (optional) what characters to add if pluralizing. Default: 's'
 * @returns The pluralized string if count requires a plural
 */
export const pluralize = (stem, count, append = 's') => {
    return stem + ((count === 1) ? '' : append)
}
/**
 * @param {Date} date
 * @returns {`${number}-${string}-${string}-${string}:${string}`}
 */
export const dateToSlug = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day}_${hours}-${minutes}`
}

// utility function to remove leading and trailing slashes
export const removeSlashes = (str, leading = true, trailing = true) => {
    if (leading && str.startsWith('/')) {
        str = str.slice(1)
    }
    if (trailing && str.endsWith('/')) {
        str = str.slice(0, -1)
    }
    return str
}

/**
 *
 * @param length
 * @returns {string}
 */
export const generateUuid = (length = 6) => {
    return Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) =>
        byte.toString(36).padStart(2, '0')
    ).join('').substring(0, length)
}

/**
 * Generates a hash string from a given input string.
 * The hash value is computed using the FNV-1a hashing algorithm.
 *
 * @param {string} str - The input string to be hashed.
 * @returns {string} - The computed hash string truncated to the specified length.
 */
export const hashString = (str) => {
    let h = 2166136261 >>> 0
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * Convert a string to slug format
 * @param {String} str - The string to convert to slug format
 * @returns {String} - slug
 */
export const slugify = (str) => {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export const sanitize = (str, { targetBlank = false, appendQueryParameters = null } = {}) => {
    if (!targetBlank && !appendQueryParameters) {
        return DOMPurify.sanitize(str)
    }

    const hook = node => {
        if (node.tagName !== 'A') return

        if (targetBlank) {
            node.setAttribute('target', '_blank')
            node.setAttribute('rel', 'noopener noreferrer')
        }

        if (appendQueryParameters) {
            try {
                const url = new URL(node.getAttribute('href'), window.location.origin)

                Object.entries(appendQueryParameters).forEach(([key, val]) => {
                    url.searchParams.set(key, val)
                })

                node.setAttribute('href', url.toString())
            } catch (_) {
                // ignore invalid URLs
            }
        }
    }

    try {
        // add a per-call temporary hook
        //  - dom purify can only be configured globally
        //  - this hook will be applied removed after sanitization
        DOMPurify.addHook('afterSanitizeAttributes', hook)

        return DOMPurify.sanitize(str)
    } finally {
        // remove all hooks for this stage (including the one we just added)
        DOMPurify.removeHook('afterSanitizeAttributes')
    }
}
