/* eslint-disable no-useless-escape */

// Extracted from @node-red/util/util.js to avoid dependency on @node-red/util package

function createError (code, message) {
    const e = new Error(message)
    e.code = code
    return e
}

/**
 * Parses a property expression, such as `msg.foo.bar[3]` to validate it
 * and convert it to a canonical version expressed as an Array of property
 * names.
 *
 * For example, `a["b"].c` returns `['a','b','c']`
 *
 * If `msg` is provided, any internal cross-references will be evaluated against that
 * object. Otherwise, it will return a nested set of properties
 *
 * For example, without msg set, 'a[msg.foo]' returns `['a', [ 'msg', 'foo'] ]`
 * But if msg is set to '{"foo": "bar"}', 'a[msg.foo]' returns `['a', 'bar' ]`
 *
 * @param  {String} str - the property expression
 * @return {Array} the normalised expression
 * @memberof @node-red/util_util
 */
function normalisePropertyExpression (str, msg, toString) {
    // This must be kept in sync with validatePropertyExpression
    // in editor/js/ui/utils.js

    const length = str.length
    if (length === 0) {
        throw createError('INVALID_EXPR', 'Invalid property expression: zero-length')
    }
    const parts = []
    let start = 0
    let inString = false
    let inBox = false
    let quoteChar
    let v
    for (let i = 0; i < length; i++) {
        const c = str[i]
        if (!inString) {
            if (c === "'" || c === '"') {
                if (i !== start) {
                    throw createError('INVALID_EXPR', 'Invalid property expression: unexpected ' + c + ' at position ' + i)
                }
                inString = true
                quoteChar = c
                start = i + 1
            } else if (c === '.') {
                if (i === 0) {
                    throw createError('INVALID_EXPR', 'Invalid property expression: unexpected . at position 0')
                }
                if (start !== i) {
                    v = str.substring(start, i)
                    if (/^\d+$/.test(v)) {
                        parts.push(parseInt(v))
                    } else {
                        parts.push(v)
                    }
                }
                if (i === length - 1) {
                    throw createError('INVALID_EXPR', 'Invalid property expression: unterminated expression')
                }
                // Next char is first char of an identifier: a-z 0-9 $ _
                if (!/[a-z0-9\$\_]/i.test(str[i + 1])) {
                    throw createError('INVALID_EXPR', 'Invalid property expression: unexpected ' + str[i + 1] + ' at position ' + (i + 1))
                }
                start = i + 1
            } else if (c === '[') {
                if (i === 0) {
                    throw createError('INVALID_EXPR', 'Invalid property expression: unexpected ' + c + ' at position ' + i)
                }
                if (start !== i) {
                    parts.push(str.substring(start, i))
                }
                if (i === length - 1) {
                    throw createError('INVALID_EXPR', 'Invalid property expression: unterminated expression')
                }
                // Start of a new expression. If it starts with msg it is a nested expression
                // Need to scan ahead to find the closing bracket
                if (/^msg[.\[]/.test(str.substring(i + 1))) {
                    let depth = 1
                    let inLocalString = false
                    let localStringQuote
                    for (let j = i + 1; j < length; j++) {
                        if (/["']/.test(str[j])) {
                            if (inLocalString) {
                                if (str[j] === localStringQuote) {
                                    inLocalString = false
                                }
                            } else {
                                inLocalString = true
                                localStringQuote = str[j]
                            }
                        }
                        if (str[j] === '[') {
                            depth++
                        } else if (str[j] === ']') {
                            depth--
                        }
                        if (depth === 0) {
                            try {
                                if (msg) {
                                    const crossRefProp = getMessageProperty(msg, str.substring(i + 1, j))
                                    if (crossRefProp === undefined) {
                                        throw createError('INVALID_EXPR', 'Invalid expression: undefined reference at position ' + (i + 1) + ' : ' + str.substring(i + 1, j))
                                    }
                                    parts.push(crossRefProp)
                                } else {
                                    parts.push(normalisePropertyExpression(str.substring(i + 1, j), msg))
                                }
                                inBox = false
                                i = j
                                start = j + 1
                                break
                            } catch (err) {
                                throw createError('INVALID_EXPR', 'Invalid expression started at position ' + (i + 1))
                            }
                        }
                    }
                    if (depth > 0) {
                        throw createError('INVALID_EXPR', "Invalid property expression: unmatched '[' at position " + i)
                    }
                    continue
                } else if (!/["'\d]/.test(str[i + 1])) {
                    // Next char is either a quote or a number
                    throw createError('INVALID_EXPR', 'Invalid property expression: unexpected ' + str[i + 1] + ' at position ' + (i + 1))
                }
                start = i + 1
                inBox = true
            } else if (c === ']') {
                if (!inBox) {
                    throw createError('INVALID_EXPR', 'Invalid property expression: unexpected ' + c + ' at position ' + i)
                }
                if (start !== i) {
                    v = str.substring(start, i)
                    if (/^\d+$/.test(v)) {
                        parts.push(parseInt(v))
                    } else {
                        throw createError('INVALID_EXPR', 'Invalid property expression: unexpected array expression at position ' + start)
                    }
                }
                start = i + 1
                inBox = false
            } else if (c === ' ') {
                throw createError('INVALID_EXPR', "Invalid property expression: unexpected ' ' at position " + i)
            }
        } else {
            if (c === quoteChar) {
                if (i - start === 0) {
                    throw createError('INVALID_EXPR', 'Invalid property expression: zero-length string at position ' + start)
                }
                parts.push(str.substring(start, i))
                // If inBox, next char must be a ]. Otherwise it may be [ or .
                if (inBox && !/\]/.test(str[i + 1])) {
                    throw createError('INVALID_EXPR', 'Invalid property expression: unexpected array expression at position ' + start)
                } else if (!inBox && i + 1 !== length && !/[\[\.]/.test(str[i + 1])) {
                    throw createError('INVALID_EXPR', 'Invalid property expression: unexpected ' + str[i + 1] + ' expression at position ' + (i + 1))
                }
                start = i + 1
                inString = false
            }
        }
    }
    if (inBox || inString) {
        // eslint-disable-next-line new-cap
        throw new createError('INVALID_EXPR', 'Invalid property expression: unterminated expression')
    }
    if (start < length) {
        parts.push(str.substring(start))
    }

    if (toString) {
        let result = parts.shift()
        while (parts.length > 0) {
            let p = parts.shift()
            if (typeof p === 'string') {
                if (/"/.test(p)) {
                    p = "'" + p + "'"
                } else {
                    p = '"' + p + '"'
                }
            }
            result = result + '[' + p + ']'
        }
        return result
    }

    return parts
}

/**
 * Gets a property of a message object.
 *
 * Unlike {@link @node-red/util-util.getObjectProperty}, this function will strip `msg.` from the
 * front of the property expression if present.
 *
 * @param  {Object} msg - the message object
 * @param  {String} expr - the property expression
 * @return {any} the message property, or undefined if it does not exist
 * @throws Will throw an error if the *parent* of the property does not exist
 * @memberof @node-red/util_util
 */
function getMessageProperty (msg, expr) {
    if (expr.indexOf('msg.') === 0) {
        expr = expr.substring(4)
    }
    return getObjectProperty(msg, expr)
}

/**
 * Gets a property of an object.
 *
 * Given the object:
 *
 *     {
 *       "pet": {
 *           "type": "cat"
 *       }
 *     }
 *
 * - `pet.type` will return `"cat"`.
 * - `pet.name` will return `undefined`
 * - `car` will return `undefined`
 * - `car.type` will throw an Error (as `car` does not exist)
 *
 * @param  {Object} msg - the object
 * @param  {String} expr - the property expression
 * @return {any} the object property, or undefined if it does not exist
 * @throws Will throw an error if the *parent* of the property does not exist
 * @memberof @node-red/util_util
 */
function getObjectProperty (msg, expr) {
    let result = null
    const msgPropParts = normalisePropertyExpression(expr, msg)
    msgPropParts.reduce(function (obj, key) {
        result = (typeof obj[key] !== 'undefined' ? obj[key] : undefined)
        return result
    }, msg)
    return result
}

/**
 * Sets a property of an object.
 *
 * @param  {Object}  msg           - the object
 * @param  {String}  prop          - the property expression
 * @param  {any}     value         - the value to set
 * @param  {boolean} createMissing - whether to create missing parent properties
 * @memberof @node-red/util_util
 */
function setObjectProperty (msg, prop, value, createMissing) {
    if (typeof createMissing === 'undefined') {
        createMissing = (typeof value !== 'undefined')
    }
    const msgPropParts = normalisePropertyExpression(prop, msg)
    const length = msgPropParts.length
    let obj = msg
    let key
    for (let i = 0; i < length - 1; i++) {
        key = msgPropParts[i]
        if (typeof key === 'string' || (typeof key === 'number' && !Array.isArray(obj))) {
            if (hasOwnProperty.call(obj, key)) {
                if (length > 1 && ((typeof obj[key] !== 'object' && typeof obj[key] !== 'function') || obj[key] === null)) {
                    // Break out early as we cannot create a property beneath
                    // this type of value
                    return false
                }
                obj = obj[key]
            } else if (createMissing) {
                if (typeof msgPropParts[i + 1] === 'string') {
                    obj[key] = {}
                } else {
                    obj[key] = []
                }
                obj = obj[key]
            } else {
                return false
            }
        } else if (typeof key === 'number') {
            // obj is an array
            if (obj[key] === undefined) {
                if (createMissing) {
                    if (typeof msgPropParts[i + 1] === 'string') {
                        obj[key] = {}
                    } else {
                        obj[key] = []
                    }
                    obj = obj[key]
                } else {
                    return false
                }
            } else {
                obj = obj[key]
            }
        }
    }
    key = msgPropParts[length - 1]
    if (typeof value === 'undefined') {
        if (typeof key === 'number' && Array.isArray(obj)) {
            obj.splice(key, 1)
        } else {
            delete obj[key]
        }
    } else {
        if (typeof obj === 'object' && obj !== null) {
            obj[key] = value
        } else {
            // Cannot set a property of a non-object/array
            return false
        }
    }
    return true
}

module.exports = {
    getObjectProperty,
    setObjectProperty
}
