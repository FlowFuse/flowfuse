const TestModelFactory = require('../../../lib/TestModelFactory.js')

let _initPromise = null
let _templates = null

async function init (forge, owner) {
    if (_initPromise) return _initPromise
    const factory = new TestModelFactory(forge)

    _initPromise = (async () => {
        const [template1, template2] = await Promise.all([
            factory.createProjectTemplate({ name: 'template1' }, owner),
            factory.createProjectTemplate({ name: 'template2' }, owner)
        ])
        _templates = {
            template1,
            template2
        }
        return _templates
    })()

    try {
        return await _initPromise
    } catch (e) {
        _initPromise = null
        _templates = null
        throw e
    }
}

function get () {
    if (!_templates) throw new Error('Templates not initialized.')
    return _templates
}

module.exports = {
    init,
    get
}
