const should = require('should') // eslint-disable-line no-unused-vars

const { redactDatabaseCredentials } = require('../../../../../../forge/ee/lib/mcp/utils')

describe('MCP utils', function () {
    describe('redactDatabaseCredentials', function () {
        it('strips the credentials field from a database object', function () {
            const result = redactDatabaseCredentials({ id: 'db1', name: 'one', credentials: { password: 'secret' } })
            result.should.eql({ id: 'db1', name: 'one' })
        })

        it('returns falsy input unchanged', function () {
            should(redactDatabaseCredentials(null)).equal(null)
            should(redactDatabaseCredentials(undefined)).equal(undefined)
        })
    })
})
