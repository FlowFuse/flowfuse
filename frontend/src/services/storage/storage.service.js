export default class {
    /**
     * @type {Storage | null}
     */
    storage = null

    /**
     * @type {number}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Storage/length storage.length}
     */
    length = this.storage?.length || 0

    /**
     * @param {Storage} storage
     * @param storage
     */
    constructor (storage) {
        this.storage = storage
    }

    /**
     * @param {string | number} index
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Storage/key storage.key}
     * @returns {*}
     */
    key (index) {
        return this.storage.key(index)
    }

    /**
     * @param {string | number} key
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Storage/getItem storage.getItem}
     * @returns {*|null}
     */
    getItem (key) {
        return this.storage.getItem(key)
    }

    /**
     *
     * @param {string | number} key
     * @param {*} value
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem storage.setItem}
     *
     * @returns {void}
     */
    setItem (key, value) {
        this.storage.setItem(key, value)
        this.length = this.storage.length
    }

    /**
     * @param {string | number} key
     * @param key
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Storage/removeItem storage.removeItem}
     * @returns {void}
     */
    removeItem (key) {
        this.storage.removeItem(key)
        this.length = this.storage.length
    }

    /**
     * @returns {void}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Storage/clear | storage.clear}
     */
    clear () {
        this.storage.clear()
        this.length = 0
    }
}
