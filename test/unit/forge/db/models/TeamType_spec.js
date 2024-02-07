const should = require('should') // eslint-disable-line
const setup = require('../setup')

let objectCount = 0
const generateName = (root = 'object') => `${root}-${objectCount++}`

describe('TeamType model', function () {
    let app

    before(async function () {
        app = await setup()
    })
    after(async function () {
        await app.close()
    })

    describe('getInstanceTypeProperty', async function () {
        it('Should read the (nested) property from an instances config when passed a hashid', async function () {
            const teamType = await app.db.models.TeamType.create({
                name: generateName('Test Team Type'),
                properties: {
                    instances: {
                        one: {
                            active: true
                        }
                    }
                }
            })

            teamType.getInstanceTypeProperty('one', 'active').should.equal(true)
        })

        it('Should read the (nested) property from an instances config when passed an whole model', async function () {
            const instanceType = await app.db.models.ProjectType.create({
                name: 'Test Instance Type'
            })

            const properties = {
                instances: {}
            }
            properties.instances[instanceType.hashid] = {
                active: true
            }
            const teamType = await app.db.models.TeamType.create({
                name: generateName('Test Team Type'),
                properties
            })
            teamType.getInstanceTypeProperty(instanceType, 'active').should.equal(true)
        })

        it('Should return the default value if property is not found', async function () {
            const teamType = await app.db.models.TeamType.create({
                name: generateName('Test Team Type'),
                properties: {
                    instances: {
                        one: {
                        }
                    }
                }
            })

            teamType.getInstanceTypeProperty('one', 'active', 'defaultValue').should.equal('defaultValue')
        })

        it('Should also return the default value if property is null', async function () {
            const teamType = await app.db.models.TeamType.create({
                name: generateName('Test Team Type'),
                properties: {
                    instances: {
                        one: {
                            active: null
                        }
                    }
                }
            })

            teamType.getInstanceTypeProperty('one', 'active', 'defaultValue').should.equal('defaultValue')
        })
    })
})
