module.exports = {
    /**
     * Computes the deep difference between two objects. The result represents
     * the changes between `currentState` and `previousState`, identifying additions,
     * removals, and modifications in nested structures such as objects and arrays.
     *
     * @param {Object|Array|null} currentState - The current state object or array to compare.
     * @param {Object|Array|null} previousState - The previous state object or array to compare.
     * @returns {Object} An object containing two properties:
     *                   - `currentStateDiff`: The differences from the current state, highlighting added or modified values.
     *                   - `previousStateDiff`: The differences from the previous state, highlighting removed or modified values.
     */
    deepDiff: (currentState, previousState) => {
        const isMergeable = v =>
            v !== null &&
            typeof v === 'object' &&
            (v.constructor === Object || Array.isArray(v))

        const sameMergeableType = (a, b) =>
            isMergeable(a) && isMergeable(b) &&
            (Array.isArray(a) === Array.isArray(b))

        function diffNode (a, b) {
            if (Object.is(a, b)) return [undefined, undefined]

            if (sameMergeableType(a, b)) {
                const aKeys = a ? Object.keys(a) : []
                const bKeys = b ? Object.keys(b) : []
                const keys = new Set([...aKeys, ...bKeys])

                const cOut = Array.isArray(a) ? [] : {}
                const pOut = Array.isArray(b) ? [] : {}

                let touched = false

                for (const k of keys) {
                    const aHas = a != null && Object.prototype.hasOwnProperty.call(a, k)
                    const bHas = b != null && Object.prototype.hasOwnProperty.call(b, k)

                    const aVal = aHas ? a[k] : undefined
                    const bVal = bHas ? b[k] : undefined

                    // addition -> only record on current side
                    if (aHas && !bHas) {
                        cOut[k] = cloneShallow(aVal)
                        touched = true
                        continue
                    }
                    // removal -> only record on previous side
                    if (!aHas && bHas) {
                        pOut[k] = cloneShallow(bVal)
                        touched = true
                        continue
                    }

                    // both present
                    const [cChild, pChild] = diffNode(aVal, bVal)
                    if (cChild !== undefined) {
                        cOut[k] = cChild
                        touched = true
                    }
                    if (pChild !== undefined) {
                        pOut[k] = pChild
                        touched = true
                    }
                }

                if (!touched) return [undefined, undefined]
                return [isEmpty(cOut) ? undefined : cOut, isEmpty(pOut) ? undefined : pOut]
            }

            // value changed (present in both)
            return [cloneShallow(a), cloneShallow(b)]
        }

        function isEmpty (x) {
            return x && typeof x === 'object' && Object.keys(x).length === 0
        }

        function cloneShallow (v) {
            if (Array.isArray(v)) return v.slice()
            if (v && v.constructor === Object) return { ...v }
            return v
        }

        const [c, p] = diffNode(currentState, previousState)
        return {
            currentStateDiff: c || {},
            previousStateDiff: p || {}
        }
    }
}
