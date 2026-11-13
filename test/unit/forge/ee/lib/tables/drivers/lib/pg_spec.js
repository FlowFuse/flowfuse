/// <reference types="should" />
const pg = require('pg')
const should = require('should')
const sinon = require('sinon')

const { newClient, tableDataTypes } = require('../../../../../../../../forge/ee/lib/tables/drivers/lib/pg.js')

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

    describe('tableDataTypes', function () {
        // parses a value the way the client would for a column of the given type OID
        const parse = (oid, value) => tableDataTypes.getTypeParser(oid, 'text')(value)

        it('should keep a date as the date that is stored', function () {
            parse(1082, '2025-08-01').should.equal('2025-08-01')
        })
        it('should keep a timestamp without a time zone as it is stored', function () {
            parse(1114, '2025-08-01 11:20:05.290019').should.equal('2025-08-01 11:20:05.290019')
        })
        it('should keep intervals, points and circles as readable text', function () {
            parse(1186, '2 days 03:00:00').should.equal('2 days 03:00:00')
            parse(600, '(1,1)').should.equal('(1,1)')
            parse(718, '<(1,1),2>').should.equal('<(1,1),2>')
        })
        it('should keep floats as numbers, and NaN and Infinity as text rather than null', function () {
            parse(701, '3.1415').should.equal(3.1415)
            parse(700, '1.5').should.equal(1.5)
            parse(701, 'NaN').should.equal('NaN')
            parse(701, 'Infinity').should.equal('Infinity')
            parse(700, '-Infinity').should.equal('-Infinity')
            JSON.parse(JSON.stringify({ value: parse(701, 'NaN') })).should.eql({ value: 'NaN' })
        })
        it('should send binary data as its size and a preview of its first bytes', function () {
            parse(17, '\\xdeadbeef').should.eql({ bytes: 4, hex: 'deadbeef' })
            parse(17, '\\x').should.eql({ bytes: 0, hex: '' })
            const long = parse(17, '\\x' + 'ab'.repeat(400))
            long.should.eql({ bytes: 400, hex: 'ab'.repeat(32) })
        })
        it('should treat the items of an array the same way', function () {
            parse(1182, '{2025-08-01,2025-08-02}').should.eql(['2025-08-01', '2025-08-02'])
            parse(1115, '{NULL,"2026-01-01 10:00:00"}').should.eql([null, '2026-01-01 10:00:00'])
            parse(1022, '{NaN,1.5}').should.eql(['NaN', 1.5])
            parse(1001, '{"\\\\xdead"}').should.eql([{ bytes: 2, hex: 'dead' }])
        })
        it('should keep the items of a numeric array as exact as a single numeric value', function () {
            parse(1700, '12345678901234567890.123').should.equal('12345678901234567890.123')
            parse(1231, '{12345678901234567890.123,NaN,NULL}').should.eql(['12345678901234567890.123', 'NaN', null])
        })
        it('should keep a timestamp with a time zone holding infinity as text rather than null', function () {
            parse(1184, 'infinity').should.equal('infinity')
            parse(1184, '-infinity').should.equal('-infinity')
            const [infinity, moment] = parse(1185, '{infinity,"2025-08-01 11:20:05+00"}')
            infinity.should.equal('infinity')
            moment.toISOString().should.equal('2025-08-01T11:20:05.000Z')
            JSON.parse(JSON.stringify({ value: parse(1184, 'infinity') })).should.eql({ value: 'infinity' })
        })
        it('should leave every other type to the default parser', function () {
            parse(23, '42').should.equal(42) // int4
            parse(16, 't').should.equal(true) // bool
            parse(20, '9223372036854775807').should.equal('9223372036854775807') // int8
            parse(114, '{"a":1}').should.eql({ a: 1 }) // json
            parse(1184, '2025-08-01 11:20:05.29+00').toISOString().should.equal('2025-08-01T11:20:05.290Z') // timestamptz
        })
    })
})
