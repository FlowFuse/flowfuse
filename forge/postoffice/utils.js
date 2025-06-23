/**
 * Generates email-safe versions (both text and html) of a piece of text.
 * This is intended to make user-provided strings (eg username) that may look
 * like a URL to not looks like a URL to an email client
 * @param {String} value
 */
function sanitizeText (value) {
    return {
        text: value.replace(/\./g, ' '),
        html: value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\./g, '<br style="display: none;"/>.')
    }
}

module.exports = {
    sanitizeText
}
