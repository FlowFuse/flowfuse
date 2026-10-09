const should = require('should') // eslint-disable-line no-unused-vars
const sinon = require('sinon')
const { z } = require('zod')

const tools = require('../../../../../../../forge/ee/lib/mcp/tools/tables')

function getTool (name) {
    return tools.find(tool => tool.name === name)
}

describe('MCP Tables Tools', function () {
    let inject

    beforeEach(function () {
        inject = sinon.stub()
    })

    describe('platform_list_team_databases', function () {
        const tool = getTool('platform_list_team_databases')

        it('calls the databases list endpoint for the team', async function () {
            inject.resolves({ statusCode: 200, json: () => [] })
            await tool.handler({ teamId: 'team1' }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/teams/team1/databases' })
        })

        it('strips credentials from every returned database and wraps them in a databases object', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => [
                    { id: 'db1', name: 'one', credentials: { password: 'secret1' } },
                    { id: 'db2', name: 'two', credentials: { password: 'secret2' } }
                ]
            })
            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.statusCode.should.equal(200)
            response.json().should.eql({
                databases: [
                    { id: 'db1', name: 'one' },
                    { id: 'db2', name: 'two' }
                ]
            })
        })

        it('passes through error responses unmodified, including any credentials', async function () {
            const errorResponse = {
                statusCode: 404,
                json: () => [{ id: 'db1', credentials: { password: 'secret1' } }]
            }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
            response.json().should.eql([{ id: 'db1', credentials: { password: 'secret1' } }])
        })
    })

    describe('platform_get_team_database', function () {
        const tool = getTool('platform_get_team_database')

        it('calls the single database endpoint for the team', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'db1' }) })
            await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/teams/team1/databases/db1' })
        })

        it('strips credentials from the returned database and wraps it in a database object', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => ({ id: 'db1', name: 'one', credentials: { password: 'secret1' } })
            })
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            response.statusCode.should.equal(200)
            response.json().should.eql({ database: { id: 'db1', name: 'one' } })
        })

        it('passes through error responses unmodified, including any credentials', async function () {
            const errorResponse = {
                statusCode: 400,
                json: () => ({ id: 'db1', credentials: { password: 'secret1' } })
            }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            response.should.equal(errorResponse)
            response.json().should.eql({ id: 'db1', credentials: { password: 'secret1' } })
        })
    })

    describe('platform_create_team_database', function () {
        const tool = getTool('platform_create_team_database')

        it('posts an empty body to the databases endpoint for the team', async function () {
            inject.resolves({ statusCode: 200, json: () => ({ id: 'db1', name: 'team1' }) })
            await tool.handler({ teamId: 'team1' }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({ method: 'POST', url: '/api/v1/teams/team1/databases', payload: {} })
        })

        it('strips credentials from the created database and wraps it in a database object', async function () {
            inject.resolves({
                statusCode: 200,
                json: () => ({ id: 'db1', name: 'team1', credentials: { password: 'secret1' } })
            })
            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.statusCode.should.equal(200)
            response.json().should.eql({ database: { id: 'db1', name: 'team1' } })
        })

        it('passes through error responses unmodified', async function () {
            const errorResponse = { statusCode: 409, json: () => ({ code: 'already_exists', error: 'Database already exists' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_list_database_tables', function () {
        const tool = getTool('platform_list_database_tables')

        it('calls the tables list endpoint and returns the response unmodified', async function () {
            const injectResponse = { statusCode: 200, json: () => [{ name: 'table1' }] }
            inject.resolves(injectResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/teams/team1/databases/db1/tables' })
            response.should.equal(injectResponse)
        })
    })

    describe('platform_get_database_table', function () {
        const tool = getTool('platform_get_database_table')

        it('calls the table endpoint with the table name and schema, and wraps the columns with the identifying fields', async function () {
            const columns = [{ name: 'id', type: 'integer' }]
            inject.resolves({ statusCode: 200, json: () => columns })
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'table1', schemaName: 'public' }, { inject })
            inject.firstCall.args[0].should.eql({ method: 'GET', url: '/api/v1/teams/team1/databases/db1/tables/table1/public' })
            response.statusCode.should.equal(200)
            response.json().should.eql({
                database: 'db1',
                tableName: 'table1',
                schemaName: 'public',
                columns
            })
        })

        it('passes through error responses unmodified', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'table_not_found', error: 'Table not found' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'table1', schemaName: 'public' }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_query_database_table_data', function () {
        const tool = getTool('platform_query_database_table_data')

        it('includes the limit query param when limit is provided', async function () {
            const injectResponse = { statusCode: 200, json: () => [{ col: 'value' }] }
            inject.resolves(injectResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'table1', schemaName: 'public', limit: 5 }, { inject })
            inject.firstCall.args[0].should.eql({
                method: 'GET',
                url: '/api/v1/teams/team1/databases/db1/tables/table1/data/public?limit=5'
            })
            response.should.equal(injectResponse)
        })

        it('omits the query string when limit is undefined', async function () {
            const injectResponse = { statusCode: 200, json: () => [] }
            inject.resolves(injectResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'table1', schemaName: 'public' }, { inject })
            inject.firstCall.args[0].should.eql({
                method: 'GET',
                url: '/api/v1/teams/team1/databases/db1/tables/table1/data/public'
            })
            response.should.equal(injectResponse)
        })

        it('includes a non-public schema segment', async function () {
            const injectResponse = { statusCode: 200, json: () => [{ col: 'value' }] }
            inject.resolves(injectResponse)
            await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'table1', schemaName: 'custom', limit: 5 }, { inject })
            inject.firstCall.args[0].should.eql({
                method: 'GET',
                url: '/api/v1/teams/team1/databases/db1/tables/table1/data/custom?limit=5'
            })
        })
    })

    describe('platform_create_database_table', function () {
        const tool = getTool('platform_create_database_table')

        it('posts the name and columns to the tables endpoint and returns the table in the public schema', async function () {
            const columns = [{ name: 'id', type: 'bigint' }, { name: 'label', type: 'text', nullable: true }]
            inject.resolves({ statusCode: 201, json: () => JSON.parse('') })
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', name: 'orders', columns }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({
                method: 'POST',
                url: '/api/v1/teams/team1/databases/db1/tables',
                payload: { name: 'orders', columns }
            })
            response.statusCode.should.equal(201)
            response.json().should.eql({ table: { name: 'orders', schema: 'public' } })
        })

        it('passes the schema through when one is given and returns it', async function () {
            const columns = [{ name: 'id', type: 'bigint' }]
            inject.resolves({ statusCode: 201, json: () => JSON.parse('') })
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', name: 'orders', schema: 'reports', columns }, { inject })
            inject.firstCall.args[0].payload.should.eql({ name: 'orders', columns, schema: 'reports' })
            response.json().should.eql({ table: { name: 'orders', schema: 'reports' } })
        })

        it('accepts valid schema names and rejects ones Postgres cannot create', function () {
            const schema = z.object(tool.inputSchema).shape.schema
            for (const valid of ['public', 'Reports', '_staging', 'a'.repeat(63)]) {
                schema.safeParse(valid).success.should.be.true(`'${valid}' should be accepted`)
            }
            for (const invalid of ['', 'a'.repeat(64), '1reports', 'my-schema', 'pg_reports', 'information_schema']) {
                schema.safeParse(invalid).success.should.be.false(`'${invalid}' should be rejected`)
            }
        })

        it('accepts only the column types the database driver supports', function () {
            const columns = z.object(tool.inputSchema).shape.columns
            columns.safeParse([{ name: 'id', type: 'double precision' }]).success.should.be.true()
            columns.safeParse([{ name: 'id', type: 'varchar' }]).success.should.be.false()
        })

        it('passes through error responses unmodified', async function () {
            const errorResponse = { statusCode: 409, json: () => ({ code: 'table_exists', error: 'Table already exists' }) }
            inject.resolves(errorResponse)
            const columns = [{ name: 'id', type: 'bigint' }]
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', name: 'orders', columns }, { inject })
            response.should.equal(errorResponse)
        })
    })

    describe('platform_delete_database_table', function () {
        const tool = getTool('platform_delete_database_table')

        it('is annotated as destructive so it is served as a delete tool', function () {
            tool.annotations.should.have.property('readOnlyHint', false)
            tool.annotations.should.have.property('destructiveHint', true)
        })

        it('deletes the table in the given schema and reports okay for the empty reply', async function () {
            inject.resolves({ statusCode: 204, body: '' })
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'orders', schemaName: 'reports' }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({ method: 'DELETE', url: '/api/v1/teams/team1/databases/db1/tables/orders/reports' })
            response.statusCode.should.equal(204)
            response.json().should.eql({ status: 'okay' })
        })

        it('encodes table and schema names that contain reserved characters', async function () {
            inject.resolves({ statusCode: 204, body: '' })
            await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'my table/1', schemaName: 'a b' }, { inject })
            inject.firstCall.args[0].url.should.equal('/api/v1/teams/team1/databases/db1/tables/my%20table%2F1/a%20b')
        })

        it('rejects empty and dot table or schema names, which would drop out of the URL', async function () {
            for (const bad of [{ schemaName: '' }, { schemaName: '.' }, { tableName: '..' }, { tableName: '' }]) {
                const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'orders', schemaName: 'reports', ...bad }, { inject })
                response.statusCode.should.equal(400)
            }
            inject.called.should.be.false()
        })

        it('requires the schema name', function () {
            z.object(tool.inputSchema).shape.schemaName.safeParse(undefined).success.should.be.false()
        })

        it('passes through the descriptive error when FlowFuse Tables is not enabled for the team', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found', error: 'Not Found - FlowFuse Tables is not enabled for this team' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'orders', schemaName: 'public' }, { inject })
            response.should.equal(errorResponse)
        })

        it('passes through a rejection for a token without write access', async function () {
            const errorResponse = { statusCode: 403, json: () => ({ code: 'unauthorized', error: 'unauthorized' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'orders', schemaName: 'public' }, { inject })
            response.should.equal(errorResponse)
        })

        it('passes through a table not found error', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'table_not_found', error: 'Table not found' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1', tableName: 'orders', schemaName: 'public' }, { inject })
            response.should.equal(errorResponse)
        })

        it('refuses ids that would reach another route', async function () {
            for (const [teamId, databaseId] of [['../teams/team2', 'db1'], ['team1', 'db1/../..'], ['team1', '..']]) {
                const response = await tool.handler({ teamId, databaseId, tableName: 'orders', schemaName: 'public' }, { inject })
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'invalid_request')
            }
            inject.called.should.be.false()
        })
    })

    describe('platform_delete_team_database', function () {
        const tool = getTool('platform_delete_team_database')

        it('is annotated as destructive so it is served as a delete tool', function () {
            tool.annotations.should.have.property('readOnlyHint', false)
            tool.annotations.should.have.property('destructiveHint', true)
        })

        it('deletes the database and reports okay for the empty object reply', async function () {
            inject.resolves({ statusCode: 200, body: '{}', json: () => ({}) })
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            inject.calledOnce.should.be.true()
            inject.firstCall.args[0].should.eql({ method: 'DELETE', url: '/api/v1/teams/team1/databases/db1' })
            response.statusCode.should.equal(200)
            response.json().should.eql({ status: 'okay' })
        })

        it('passes through the descriptive error when FlowFuse Tables is not enabled for the team', async function () {
            const errorResponse = { statusCode: 404, json: () => ({ code: 'not_found', error: 'Not Found - FlowFuse Tables is not enabled for this team' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            response.should.equal(errorResponse)
        })

        it('passes through a rejection for a token without write access', async function () {
            const errorResponse = { statusCode: 403, json: () => ({ code: 'unauthorized', error: 'unauthorized' }) }
            inject.resolves(errorResponse)
            const response = await tool.handler({ teamId: 'team1', databaseId: 'db1' }, { inject })
            response.should.equal(errorResponse)
        })

        it('refuses ids that would reach another route', async function () {
            for (const [teamId, databaseId] of [['team1/../team2', 'db1'], ['team1', '../..'], ['team1', 'db1?x=1']]) {
                const response = await tool.handler({ teamId, databaseId }, { inject })
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'invalid_request')
            }
            inject.called.should.be.false()
        })
    })
})
