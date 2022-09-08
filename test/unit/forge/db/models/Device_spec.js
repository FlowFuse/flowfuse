const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Device model', function () {
    // Use standard test data.
    let app

    afterEach(async function () {
        if (app) {
            await app.close()
            app = null
        }
    })

    describe('License limits', function () {
        it('limits how many devices can be created according to license', async function () {
            // This license has limit of 2 devices
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'
            app = await setup({ license })

            ;(await app.db.models.Device.count()).should.equal(0)

            await app.db.models.Device.create({ name: 'D1', type: '', credentialSecret: '' })
            await app.db.models.Device.create({ name: 'D2', type: '', credentialSecret: '' })
            ;(await app.db.models.Device.count()).should.equal(2)

            try {
                await app.db.models.Device.create({ name: 'D3', type: '', credentialSecret: '' })
                return Promise.reject(new Error('able to create device that exceeds limit'))
            } catch (err) { }

            await app.db.models.Device.destroy({ where: { name: 'D2', type: '', credentialSecret: '' } })
            ;(await app.db.models.Device.count()).should.equal(1)
            await app.db.models.Device.create({ name: 'D3', type: '', credentialSecret: '' })
            ;(await app.db.models.Device.count()).should.equal(2)
        })
    })
})
