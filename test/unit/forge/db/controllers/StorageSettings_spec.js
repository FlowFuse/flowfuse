const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Storage Settings controller', function () {
    // Use standard test data.
    let app
    beforeEach(async function () {
        app = await setup()
    })

    afterEach(async function () {
        await app.close()
    })

    describe('getProjectModules', function () {
        it('returns the modules Node-RED has discovered and stored in settings', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject',
                type: '',
                url: ''
            })

            await app.db.models.StorageSettings.create({
                settings: '{"nodes":{"node-red":{"name":"node-red","version":"3.0.0","local":false,"user":false},"@flowforge/nr-project-nodes":{"name":"@flowforge/nr-project-nodes","version":"0.1.0","local":false,"user":false},"node-red-node-random":{"name":"node-red-node-random","version":"1.2.3","local":true}}}',
                ProjectId: project.id
            })

            const result = await app.db.controllers.StorageSettings.getProjectModules(project)

            result.should.have.length(1)
            result[0].should.have.property('name', 'node-red-node-random')
            result[0].should.have.property('version', '1.2.3')
            result[0].should.have.property('local', true)
        })
        it('returns an empty list if Node-RED has not stored anything', async function () {
            const project = await app.db.models.Project.create({
                name: 'testProject',
                type: '',
                url: ''
            })

            const result = await app.db.controllers.StorageSettings.getProjectModules(project)

            result.should.have.length(0)
        })
    })
})
