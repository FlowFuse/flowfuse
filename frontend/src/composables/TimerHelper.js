export default function useTimerHelper () {
    /**
     * Asynchronously waits while a condition remains true, checking at regular intervals.
     *
     * @param {boolean|Function} condition - A boolean value or a function that returns a boolean.
     *                                        The waiting continues while this evaluates to true.
     * @param {Object} options - Configuration options for the waiting behavior.
     * @param {number} [options.cutoffTries=Infinity] - Maximum number of attempts before throwing an error.
     *                                                   Must be a non-negative finite number.
     * @param {number} [options.intervalMs=1000] - Time in milliseconds to wait between condition checks.
     *                                              Must be a non-negative finite number.
     * @returns {Promise<void>} Resolves when the condition becomes false.
     * @throws {Error} If intervalMs or cutoffTries are invalid (negative or non-finite).
     * @throws {Error} If the maximum number of tries (cutoffTries) is reached before condition becomes false.
     */
    async function waitWhile (condition, { cutoffTries = Infinity, intervalMs = 1000 } = {}) {
        const predicate = (typeof condition === 'function')
            ? condition
            : () => Boolean(condition)

        const delayMs = Number(intervalMs)
        if (!Number.isFinite(delayMs) || delayMs < 0) {
            throw new Error(`waitWhile: intervalMs must be a non-negative number, got ${intervalMs}`)
        }

        const maxTries = Number(cutoffTries)
        if (!Number.isFinite(maxTries) || maxTries < 0) {
            throw new Error(`waitWhile: cutoffTries must be a non-negative number, got ${cutoffTries}`)
        }

        let tries = 0
        while (predicate()) {
            if (tries >= maxTries) {
                throw new Error(`waitWhile: cutoffTries (${maxTries}) reached`)
            }
            tries++
            await waitFor(delayMs)
        }
    }

    async function waitFor (delayMs) {
        return new Promise(resolve => setTimeout(resolve, delayMs))
    }

    async function doWhile (condition, callback, { intervalMs } = {}) {
        const predicate = (typeof condition === 'function')
            ? condition
            : () => Boolean(condition)

        do {
            await callback()
            await waitFor(intervalMs)
        } while (predicate())
    }

    return {
        doWhile,
        waitWhile,
        waitFor
    }
}
