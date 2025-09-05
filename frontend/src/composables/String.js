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
 * The length of the returned hash can be configured.
 *
 * @param {string} str - The input string to be hashed.
 * @param {number} [length=5] - The desired length of the resulting hash string. Defaults to 5 characters.
 * @returns {string} - The computed hash string truncated to the specified length.
 */
export const hashString = (str, length = 5) => {
    let h = 2166136261 >>> 0
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(16).substring(0, length)
}

/**
 * Generates a non-deterministic hashed string of a specified length.
 *
 * This function asynchronously computes a SHA-1 hash of the input string
 * and converts the result into a hexadecimal representation. The output
 * is truncated to the specified length, defaulting to 5 characters.
 *
 * Note: Due to the use of SHA-1, this function should not be used
 * for cryptographic purposes or security-critical applications.
 *
 * @param {string} str - The input string to be hashed.
 * @param {number} [length=5] - The desired length of the resulting hash string.
 * @returns {Promise<string>} A promise that resolves to the non-deterministic hashed string.
 */
export const nonDeterministicHashString = async (str, length = 5) => {
    const data = new TextEncoder().encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, length)
}
