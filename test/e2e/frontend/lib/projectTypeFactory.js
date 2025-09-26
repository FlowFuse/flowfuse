const TestModelFactory = require('../../../lib/TestModelFactory.js')

let _initPromise = null
let _projectTypes = null

async function init (forge) {
    if (_initPromise) return _initPromise
    const factory = new TestModelFactory(forge)

    _initPromise = (async () => {
        const [type1, type2] = await Promise.all([
            factory.createProjectType({ name: 'type1' }),
            factory.createProjectType({ name: 'type2' })
        ])
        _projectTypes = {
            type1, type2
        }
        return _projectTypes
    })()

    try {
        return await _initPromise
    } catch (e) {
        _initPromise = null
        _projectTypes = null
        throw e
    }
}

function get () {
    if (!_projectTypes) throw new Error('Project Types not initialized.')
    return _projectTypes
}

module.exports = {
    init,
    get
}
