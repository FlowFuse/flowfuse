export const isValidURL = (string) => {
    // eslint-disable-next-line
    return /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(string)
}

export const capitalize = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1)
}
