/**
 * Download a String or Object as a file. If an object is provided, it will be stringified.
 * User should provide the filename and its extension.
 * @param {Object|String} input - The string or stringify-able object to download
 * @param {String} [filename="data.json"] - The filename to save as (default: "data.json")
 */
function downloadData (input, filename) {
    const element = document.createElement('a')
    const data = typeof input === 'string' ? input : JSON.stringify(input, null, 2)

    try {
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data))
        element.setAttribute('download', filename || 'data.json')
        element.style.display = 'none'
        document.body.appendChild(element)
        element.click()
    } catch (err) {
        console.error(err)
        throw err
    } finally {
        document.body.removeChild(element)
    }
}

export {
    downloadData
}
