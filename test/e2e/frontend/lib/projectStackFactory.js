const TestModelFactory = require('../../../lib/TestModelFactory.js')

const projectTypes = require('./projectTypeFactory.js')

let _initPromise = null
let _projectStacks = null

async function init (forge) {
    if (_initPromise) return _initPromise
    const factory = new TestModelFactory(forge)

    _initPromise = (async () => {
        const { type1: projectType, type2: spareProjectType } = projectTypes.get()
        const [stack1, stack2, stack3] = await Promise.all([
            factory.createStack({ name: 'stack1', label: 'stack 1' }, projectType),
            factory.createStack({ name: 'stack2', label: 'stack 2' }, projectType),
            factory.createStack({ name: 'stack1-for-type2', label: 'stack 1 for type2' }, spareProjectType)
        ])
        _projectStacks = {
            stack1, stack2, stack3
        }
        return _projectStacks
    })()

    try {
        return await _initPromise
    } catch (e) {
        _initPromise = null
        _projectStacks = null
        throw e
    }
}

function get () {
    if (!_projectStacks) throw new Error('Project Types not initialized.')
    return _projectStacks
}

module.exports = {
    init,
    get
}
