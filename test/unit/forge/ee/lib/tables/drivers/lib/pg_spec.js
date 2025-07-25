/// <reference types="should" />
const pg = require('pg')
const should = require('should')
const sinon = require('sinon')

const { newClient } = require('../../../../../../../../forge/ee/lib/tables/drivers/lib/pg.js')

describe('Tables: helper lib for pg', function () {
    afterEach(function () {
        sinon.restore()
        sinon.resetHistory()
        if (pg.Client.restore) {
            pg.Client.restore()
        }
    })
    it('should create a new pg Client with correct options', function () {
        const mockPostgresClient = {
            Client: sinon.stub().callsFake((options) => {
                const client = {
                    _mock: true,
                    connect: sinon.stub().resolves(),
                    query: sinon.stub().resolves({ rows: [] }),
                    end: sinon.stub().resolves()
                }
                return client
            })
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
        should.exist(client)
        client.should.have.property('_mock', true)
        client.connect.should.be.a.Function()
        client.query.should.be.a.Function()
        client.end.should.be.a.Function()

        mockPostgresClient.Client.calledOnce.should.be.true()
        const calledWith = mockPostgresClient.Client.firstCall.args[0]
        calledWith.should.have.property('host', 'localhost')
        calledWith.should.have.property('port', 5432)
        calledWith.should.have.property('ssl', true)
        calledWith.should.have.property('user', 'testuser')
        calledWith.should.have.property('password', 'testpass')
        calledWith.should.have.property('database', 'testdb')
        calledWith.should.have.property('extra', 'value')
    })
})
