/// <reference types="should" />
require('should')
const axios = require('axios')
const pg = require('pg')
const sinon = require('sinon')

const driver = require('../../../../../../../forge/ee/lib/tables/drivers/postgres-supavisor.js')

describe('Tables: Postgres Supavisor Driver', function () {
    let app
    const options = { backend: { supavisorHost: 'db1', host: 'localhost', port: 5432, database: 'postgres', ssl: true }, supavisor: { domain: 'db.local', port: 5433, ssl: false, url: 'http://db.local:5433' } }
    /**
     * @type {Object.<string, import('pg').Client>}
     */
    let pgClients = {}

    beforeEach(function () {
        app = {
            log: {
                error: sinon.stub(),
                info: sinon.stub(),
                debug: sinon.stub()
            },
            db: {
                models: {
                    Table: {
                        byTeamId: sinon.stub(),
                        byId: sinon.stub(),
                        create: sinon.stub()
                    }
                }
            }
        }

        // Reset mocks before each test
        sinon.resetHistory()

        sinon.stub(pg, 'Client').callsFake((opts) => {
            const key = opts.database || `${opts.host}:${opts.port}`
            pgClients[key] = pgClients[key] || {
                connect: sinon.stub().resolves(),
                on: sinon.stub(),
                end: sinon.stub().resolves(),
                query: sinon.stub().resolves({ rows: [] })
            }
            return pgClients[key]
        })
    })
    afterEach(function () {
        sinon.restore()
        pgClients = {}
        if (pg.Client.restore) {
            pg.Client.restore()
        }
        pgClients = {}
        if (axios.get.restore) {
            axios.get.restore()
        }
        if (axios.post.restore) {
            axios.post.restore()
        }
        if (axios.put.restore) {
            axios.put.restore()
        }
        if (axios.delete.restore) {
            axios.delete.restore()
        }
    })

    describe('init', function () {
        it('should throw if no database options provided', async function () {
            await driver.init(app, {}).should.be.rejectedWith('Postgres Supavisor driver requires backend options to be provided')
        })
        it('should connect admin client and log info', async function () {
            await driver.init(app, options)
            driver._adminClient.connect.calledOnce.should.be.true()
            app.log.info.calledWith('Postgres Supavisor driver initialized').should.be.true()
        })
        it('should log error if connect fails', async function () {
            // driver._adminClient.connect.rejects(new Error('fail'))
            // override the connect method to simulate failure
            pg.Client.restore()
            sinon.stub(pg, 'Client').callsFake((pg, opts) => {
                return {
                    connect: sinon.stub().rejects(new Error('fail')),
                    on: sinon.stub(),
                    end: sinon.stub().resolves(),
                    query: sinon.stub().resolves({ rows: [] })
                }
            })
            await driver.init(app, options)
            app.log.error.calledWithMatch('Failed to connect to Postgres:').should.be.true()
        })
    })

    describe('shutdown', function () {
        it('should end admin client and log info', async function () {
            await driver.init(app, options)
            await driver.shutdown()
            driver._adminClient.end.calledOnce.should.be.true()
            app.log.info.calledWith('Shutting down Postgres Supavisor driver').should.be.true()
        })
        it('should log debug if end fails', async function () {
            await driver.init(app, options)
            driver._adminClient.end.rejects(new Error('fail'))
            await driver.shutdown()
            app.log.debug.calledWithMatch('Error shutting down Postgres Supavisor driver:').should.be.true()
        })
    })

    describe('getDatabases', function () {
        it('should return tables for team', async function () {
            const tables = [{ id: 1 }]
            app.db.models.Table.byTeamId.resolves(tables)
            await driver.init(app, options)
            const result = await driver.getDatabases({ id: 1 })
            result.should.eql(tables)
        })
        it('should return empty array if no tables', async function () {
            app.db.models.Table.byTeamId.resolves([])
            await driver.init(app, options)
            const result = await driver.getDatabases({ id: 1 })
            result.should.eql([])
        })
    })

    describe('getDatabase', function () {
        it('should return table if found', async function () {
            const table = { id: 1 }
            app.db.models.Table.byId.resolves(table)
            await driver.init(app, options)
            const result = await driver.getDatabase({ id: 1 }, 1)
            result.should.eql(table)
        })
        it('should throw if not found', async function () {
            app.db.models.Table.byId.resolves(null)
            await driver.init(app, options)
            await driver.getDatabase({ id: 1, hashid: 't1' }, 2).should.be.rejectedWith('Database 2 for team t1 does not exist')
        })
    })

    describe('createDatabase', function () {
        it('should create a new table with correct options', async function () {
            const team = { id: 1, hashid: 't1hash' }
            const name = 't1'
            app.db.models.Table.create.resolves({ id: 1, name })
            // Mock axios to resolve successfully with a 201 status
            sinon.stub(axios, 'put').resolves({ status: 201, data: { success: true } })

            await driver.init(app, options)
            const result = await driver.createDatabase(team, name)
            result.should.have.property('id', 1)
            result.should.have.property('name', name)

            // adminClient.query() should be called with correct DDL
            driver._adminClient.query.calledWithMatch('SELECT datname FROM pg_database WHERE datistemplate = false AND datname = $1', [team.hashid]).should.be.true()
            driver._adminClient.query.calledWithMatch(`CREATE DATABASE "${team.hashid}"`).should.be.true()
            driver._adminClient.query.calledWithMatch(`REVOKE connect ON DATABASE "${team.hashid}" FROM PUBLIC;`).should.be.true()

            // teamClient.connect() should be called and the DDL executed followed by end
            const client = pgClients[team.hashid] // Use the team hashid as key
            client.connect.calledOnce.should.be.true()
            client.query.calledWithMatch(`CREATE ROLE "${team.hashid}-role" WITH LOGIN`).should.be.true()
            client.query.calledWithMatch(`GRANT CONNECT ON DATABASE "${team.hashid}" TO "${team.hashid}-role"`).should.be.true()
            client.query.calledWithMatch(`GRANT ALL PRIVILEGES ON DATABASE "${team.hashid}" TO "${team.hashid}-role"`).should.be.true()
            client.query.calledWithMatch(`GRANT CREATE ON SCHEMA public TO "${team.hashid}-role"`).should.be.true()
            client.query.calledWithMatch(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${team.hashid}-role"`).should.be.true()
            client.query.calledWithMatch(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${team.hashid}-role"`).should.be.true()
            client.query.calledWithMatch(`CREATE USER "${team.hashid}" WITH PASSWORD`).should.be.true()
            client.query.calledWithMatch(`GRANT "${team.hashid}-role" TO "${team.hashid}"`).should.be.true()
            client.end.calledOnce.should.be.true()

            // this._app.log.info(`Database created for team ${team.hashid}`)
            app.log.info.calledWith(`Database created for team ${team.hashid}`).should.be.true()

            // Ensure the table was created with correct properties
            app.db.models.Table.create.calledOnce.should.be.true()
            app.db.models.Table.create.firstCall.args[0].should.have.property('TeamId', team.id)
            app.db.models.Table.create.firstCall.args[0].should.have.property('name', name)

            app.db.models.Table.create.firstCall.args[0].should.have.property('credentials') // values from supavisor options and team
            app.db.models.Table.create.firstCall.args[0].credentials.should.have.property('host', 'db.local') // value from options.supavisor.domain
            app.db.models.Table.create.firstCall.args[0].credentials.should.have.property('port', 5433)
            app.db.models.Table.create.firstCall.args[0].credentials.should.have.property('ssl', false)
            app.db.models.Table.create.firstCall.args[0].credentials.should.have.property('database', team.hashid)
            app.db.models.Table.create.firstCall.args[0].credentials.should.have.property('user', `${team.hashid}.${team.hashid}`)
            app.db.models.Table.create.firstCall.args[0].credentials.should.have.property('password').and.have.length(16) // Ensure password is generated

            app.db.models.Table.create.firstCall.args[0].should.have.property('meta') // values from backend options
            app.db.models.Table.create.firstCall.args[0].meta.should.have.property('host', 'localhost')
            app.db.models.Table.create.firstCall.args[0].meta.should.have.property('port', 5432)
            app.db.models.Table.create.firstCall.args[0].meta.should.have.property('ssl', true)
            app.db.models.Table.create.firstCall.args[0].meta.should.have.property('database', 'postgres')
        })

        it('should throw if database already exists', async function () {
            app.db.models.Table.byTeamId.resolves([{ id: 1 }])
            await driver.init(app, options)
            await driver.createDatabase({ id: 1 }, 'existingdb').should.be.rejectedWith('Database already exists')
        })

        it('should throw if datname already exists', async function () {
            await driver.init(app, options)
            driver._adminClient.query.withArgs('SELECT datname FROM pg_database WHERE datistemplate = false AND datname = $1', ['existingdb']).callsFake(() => {
                return Promise.resolve({ rows: [{ datname: 'existingdb' }] })
            })
            await driver.createDatabase({ id: 1, hashid: 'existingdb' }, 'existingdb').should.be.rejectedWith('Database already exists')
        })
    })

    describe('destroyDatabase', function () {
        it('should destroy database, user, and role if db exists', async function () {
            const team = { id: 1, hashid: 't1hash' }
            const dbObj = { destroy: sinon.stub().resolves() }
            app.db.models.Table.byId.resolves(dbObj)
            await driver.init(app, options)
            sinon.stub(axios, 'delete').resolves({ status: 200, data: { success: true } })
            // Simulate database exists in Postgres
            driver._adminClient.query.withArgs('SELECT datname FROM pg_database WHERE datistemplate = false AND datname = $1', [team.hashid]).resolves({ rows: [{ datname: team.hashid }] })
            await driver.destroyDatabase(team, 1)
            // Verify axios call to Supavisor
            axios.delete.calledWithMatch(`http://db.local:5433/api/tenants/${team.hashid}`).should.be.true()
            // Verify adminClient queries
            driver._adminClient.query.calledWithMatch(`DROP DATABASE IF EXISTS "${team.hashid}"`).should.be.true()
            driver._adminClient.query.calledWithMatch(`DROP USER IF EXISTS "${team.hashid}"`).should.be.true()
            driver._adminClient.query.calledWithMatch(`DROP ROLE IF EXISTS "${team.hashid}-role"`).should.be.true()
            dbObj.destroy.calledOnce.should.be.true()
        })
        it('should throw if db does not exist in Table', async function () {
            app.db.models.Table.byId.resolves(null)
            await driver.init(app, options)
            await driver.destroyDatabase({ id: 1, hashid: 't1hash' }, 1).should.be.rejectedWith('Database 1 for team t1hash does not exist')
        })
        it('should not throw error if db does not exist in Postgres', async function () {
            const team = { id: 1, hashid: 't1hash' }
            const dbObj = { destroy: sinon.stub().resolves() }
            app.db.models.Table.byId.resolves(dbObj)
            sinon.stub(axios, 'delete').resolves({ status: 200, data: { success: true } })
            await driver.init(app, options)
            driver._adminClient.query.withArgs('SELECT datname FROM pg_database WHERE datistemplate = false AND datname = $1', [team.hashid]).resolves({ rows: [] })
            await driver.destroyDatabase(team, 1).should.be.fulfilled()
            driver._adminClient.query.calledOnce.should.be.true() // only the select query - no drops since db does not exist
            driver._adminClient.query.calledWithMatch('SELECT datname FROM pg_database WHERE datistemplate = false AND datname = $1', [team.hashid]).should.be.true()
            dbObj.destroy.called.should.be.false() // skipped since db does not exist
        })
    })

    describe('getTables', function () {
        it('should return mapped tables if found', async function () {
            const team = { id: 1, hashid: 't1hash' }
            const dbObj = { TeamId: 1 }
            app.db.models.Table.byId.resolves(dbObj)
            await driver.init(app, options)
            pgClients[team.hashid] = {
                connect: sinon.stub().resolves(),
                query: sinon.stub().resolves({ rows: [{ tablename: 'foo', schemaname: 'public' }] }),
                end: sinon.stub().resolves()
            }
            const result = await driver.getTables(team, team.hashid)
            result.should.eql([{ name: 'foo', schema: 'public' }])
        })
        it('should return empty array if no tables', async function () {
            const team = { id: 1, hashid: 't1hash' }
            const dbObj = { TeamId: 1 }
            app.db.models.Table.byId.resolves(dbObj)
            await driver.init(app, options)
            pgClients[team.hashid] = {
                connect: sinon.stub().resolves(),
                query: sinon.stub().resolves({ rows: [] }),
                end: sinon.stub().resolves()
            }
            const result = await driver.getTables(team, team.hashid)
            result.should.eql([])
        })
        it('should throw if db does not exist', async function () {
            app.db.models.Table.byId.resolves(null)
            await driver.init(app, options)
            await driver.getTables({ id: 1, hashid: 't1hash' }, 'dbid').should.be.rejectedWith('Database dbid for team t1hash does not exist')
        })
    })

    describe('getTable', function () {
        it('should return mapped columns if found', async function () {
            const team = { id: 1, hashid: 't1hash' }
            const dbObj = { TeamId: 1 }
            app.db.models.Table.byId.resolves(dbObj)
            await driver.init(app, options)
            pgClients[team.hashid] = {
                connect: sinon.stub().resolves(),
                query: sinon.stub().resolves({ rows: [{ column_name: 'id', udt_name: 'int4', is_nullable: 'NO', column_default: null, is_generated: 'NEVER' }] }),
                end: sinon.stub().resolves()
            }
            const result = await driver.getTable(team, team.hashid, 'table1')
            result.should.eql([{ name: 'id', type: 'int4', nullable: false, default: null, generated: false }])
        })
        it('should throw if table is not found', async function () {
            const team = { id: 1, hashid: 't1hash' }
            const dbObj = { TeamId: 1 }
            app.db.models.Table.byId.resolves(dbObj)
            await driver.init(app, options)
            pgClients[team.hashid] = {
                connect: sinon.stub().resolves(),
                query: sinon.stub().resolves({ rows: [] }),
                end: sinon.stub().resolves()
            }
            await driver.getTable(team, team.hashid, 'table1').should.be.rejectedWith('Failed to retrieve table table1 for team t1hash: Table table1 does not exist in database t1hash for team t1hash')
        })
        it('should throw if db does not exist', async function () {
            app.db.models.Table.byId.resolves(null)
            await driver.init(app, options)
            await driver.getTable({ id: 1, hashid: 't1hash' }, 'dbid', 'table1').should.be.rejectedWith('Database dbid for team t1hash does not exist')
        })
    })

    describe('getTableData', function () {
        it('should return rows if found', async function () {
            const team = { id: 1, hashid: 't1hash' }
            const dbObj = { TeamId: 1 }
            app.db.models.Table.byId.resolves(dbObj)
            await driver.init(app, options)
            // Patch Client for getTableData
            pgClients[team.hashid] = {
                connect: sinon.stub().resolves(),
                query: sinon.stub().resolves({ rows: [{ id: 1, name: 'foo' }] }),
                end: sinon.stub().resolves()
            }
            const client = pgClients[team.hashid] // Use the team hashid as key
            const result = await driver.getTableData(team, team.hashid, 'table1', 5)
            result.should.eql([{ id: 1, name: 'foo' }])
            client.connect.calledOnce.should.be.true()
            client.query.calledWith('SELECT * FROM "table1" LIMIT $1', [5]).should.be.true()
            client.end.calledOnce.should.be.true()
        })
        it('should return empty array if no rows', async function () {
            const team = { id: 1, hashid: 't1hash' }
            const dbObj = { TeamId: 1 }
            app.db.models.Table.byId.resolves(dbObj)
            await driver.init(app, options)
            // Patch Client for getTableData
            pgClients[team.hashid] = {
                connect: sinon.stub().resolves(),
                query: sinon.stub().resolves({ rows: [] }),
                end: sinon.stub().resolves()
            }
            const client = pgClients[team.hashid] // Use the team hashid as key
            const result = await driver.getTableData(team, team.hashid, 'table1', 5)
            result.should.eql([])
            client.connect.calledOnce.should.be.true()
            client.query.calledWith('SELECT * FROM "table1" LIMIT $1', [5]).should.be.true()
            client.end.calledOnce.should.be.true()
        })
        it('should throw if db does not exist', async function () {
            app.db.models.Table.byId.resolves(null)
            await driver.init(app, options)
            await driver.getTableData({ id: 1, hashid: 't1hash' }, 'dbid', 'table1', 5).should.be.rejectedWith('Database dbid for team t1hash does not exist')
        })
    })
})
