const should = require('should') // eslint-disable-line no-unused-vars

const { redactDatabaseCredentials, emptySuccessAsOkay } = require('../../../../../../forge/ee/lib/mcp/utils')

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

    describe('emptySuccessAsOkay', function () {
        it('turns an empty success body into { status: "okay" }', function () {
            const result = emptySuccessAsOkay({ statusCode: 201, body: '' })
            result.statusCode.should.equal(201)
            result.json().should.eql({ status: 'okay' })
        })

        it('leaves a success with a body unchanged', function () {
            const response = { statusCode: 200, body: '{"id":"a"}' }
            emptySuccessAsOkay(response).should.equal(response)
        })

        it('leaves an error unchanged, even with an empty body', function () {
            const response = { statusCode: 404, body: '' }
            emptySuccessAsOkay(response).should.equal(response)
        })
    })
})
