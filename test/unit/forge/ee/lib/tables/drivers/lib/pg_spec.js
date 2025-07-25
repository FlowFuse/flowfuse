/// <reference types="should" />
require('should')
const pg = require('pg')
const sinon = require('sinon')

const { newClient } = require('../../../../../../../../forge/ee/lib/tables/drivers/lib/pg.js')

describe('Tables: helper lib for pg', function () {
    it('should create a new pg Client with correct options', function () {
        const mockPostgresClient = {
            Client: sinon.stub()
        }
        sinon.stub(pg, 'Client').callsFake(mockPostgresClient.Client)
        const options = {
            host: 'localhost',
            port: 5432,
            ssl: true,
            user: 'testuser',
            password: 'testpass',
            database: 'testdb',
            extra: 'value' // test extra option passthrough
        }
        const client = newClient(options)
        client.should.be.instanceOf(mockPostgresClient.Client)

        mockPostgresClient.Client.calledOnce.should.be.true()
        const calledWith = mockPostgresClient.Client.firstCall.args[0]
        calledWith.should.have.property('host', 'localhost')
        calledWith.should.have.property('port', 5432)
        calledWith.should.have.property('ssl', true)
        calledWith.should.have.property('user', 'testuser')
        calledWith.should.have.property('password', 'testpass')
        calledWith.should.have.property('database', 'testdb')
        calledWith.should.have.property('domain', 'domain.com') // example of a domain option
        calledWith.should.have.property('extra', 'value')
    })
})
