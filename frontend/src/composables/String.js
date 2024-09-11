export const isValidURL = (string) => {
    // eslint-disable-next-line
    return /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(string)
}

export const capitalize = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1)
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
