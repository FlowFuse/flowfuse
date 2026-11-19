const should = require('should')

const setup = require('../setup')

describe('AgentAction controller', function () {
    let app

    before(async function () {
        app = await setup()
    })

    after(async function () {
        await app.close()
    })

    it('is registered under app.db.controllers with its expected functions', function () {
        // 'AgentAction' has to be listed in forge/db/controllers/index.js's modelTypes for this
        // to exist at all - if it were ever dropped, app.db.controllers.AgentAction would be
        // undefined and this is the only test that would catch it.
        const controller = app.db.controllers.AgentAction
        should.exist(controller)
        controller.setPending.should.be.a.Function()
        controller.clearPending.should.be.a.Function()
        controller.consumePending.should.be.a.Function()
    })
})
