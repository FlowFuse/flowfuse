const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Logging API', function () {
    let app
    let project
    // let tokens
    let project2
    let tokens2

    beforeEach(async function () {
        app = await setup()
        project = app.project
        // tokens = await project.refreshAuthTokens()

        project2 = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })
        await app.team.addProject(project2)
        tokens2 = await project2.refreshAuthTokens()
    })

    afterEach(async function () {
        await app.close()
    })

    it('POST Rejects invalid token /audit', async function () {
        const url = `/logging/${project.id}/audit`
        const response = await app.inject({
            method: 'POST',
            url,
            headers: {
                authorization: `Bearer ${tokens2.token}`
            },
            payload: {}
        })
        response.statusCode.should.equal(404)
    })
})
