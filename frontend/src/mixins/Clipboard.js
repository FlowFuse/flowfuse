export default {
    methods: {
        /**
         * Copy the given value to the clipboard
         * @param {*} value Value to copy to clipboard
         * @returns {Promise<boolean>}
         */
        async copyToClipboard (value) {
            return Clipboard.copy(value)
        }
    },
    computed: {
        /**
         * Clipboard access is via the modern navigator.clipboard API and requires user permission
         * or the page to be served via a secured context. Use this property to determine if the
         * current browser supports clipboard. Useful for showing or hiding copy buttons.
         * @returns {boolean}
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
         * @see https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
         */
        clipboardSupported () {
            return Clipboard.supported
        }
    }
}

const Clipboard = {
    get supported () {
        return !!(navigator.clipboard && navigator.clipboard.writeText)
    },

    async requestPermission () {
        try {
            return await navigator.permissions.query({ name: 'clipboard-write' })
        } catch (error) {
            // Firefox does not support 'clipboard-write', assume permission granted
            return { state: 'granted' }
        }
    },

    /** @param {string} value */
    async writeClipboard (value) {
        const permissions = await Clipboard.requestPermission()
        if (permissions.state === 'granted') {
            await navigator.clipboard.writeText(value)
            return true
        }
        return false
    },

    async copy (input) {
        const value = Clipboard.normaliseInput(input)
        return Clipboard.writeClipboard(value)
    },

    normaliseInput (input) {
        const data = typeof input === 'function' ? input() : input
        let value
        switch (typeof data) {
        case 'string':
            value = data
            break
        case 'object':
            value = JSON.stringify(data || '') || '' // empty string if null object
            break
        default:
            value = String(data)
        }
        return value
    }
}
