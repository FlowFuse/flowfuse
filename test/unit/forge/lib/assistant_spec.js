require('should')
const sinon = require('sinon')

const assistant = require('../../../../forge/lib/assistant')

describe('assistant.js', function () {
    describe('generatePostgreSqlDdl', function () {
        it('should generate DDL for a simple table with PK, FK, index, and comments', function () {
            const columns = [
                { table_schema: 'public', table_name: 'users', column_name: 'id', udt_name: 'int4', is_nullable: 'NO', column_default: null, table_type: 'BASE TABLE', character_maximum_length: null },
                { table_schema: 'public', table_name: 'users', column_name: 'name', udt_name: 'varchar', is_nullable: 'YES', column_default: null, table_type: 'BASE TABLE', character_maximum_length: 255 },
                { table_schema: 'public', table_name: 'users', column_name: 'role_id', udt_name: 'int4', is_nullable: 'YES', column_default: null, table_type: 'BASE TABLE', character_maximum_length: null },
                { table_schema: 'public', table_name: 'roles', column_name: 'id', udt_name: 'int4', is_nullable: 'NO', column_default: null, table_type: 'BASE TABLE', character_maximum_length: null },
                { table_schema: 'public', table_name: 'roles', column_name: 'name', udt_name: 'varchar', is_nullable: 'YES', column_default: null, table_type: 'BASE TABLE', character_maximum_length: 100 }
            ]
            const pks = [
                { table_schema: 'public', table_name: 'users', column_name: 'id' },
                { table_schema: 'public', table_name: 'roles', column_name: 'id' }
            ]
            const fks = [
                { from_schema: 'public', from_table: 'users', from_column: 'role_id', to_schema: 'public', to_table: 'roles', to_column: 'id' }
            ]
            const indexes = [
                { schema_name: 'public', table_name: 'users', index_name: 'users_name_idx', column_names: ['name'] }
            ]
            const comments = [
                { schema_name: 'public', table_name: 'users', column_name: 'id', column_comment: 'User ID' },
                { schema_name: 'public', table_name: 'users', column_name: 'name', column_comment: 'User name' }
            ]
            const ddl = assistant.generatePostgreSqlDdl(columns, pks, fks, indexes, comments)
            ddl.should.match(/CREATE TABLE "public"\."users"/)
            ddl.should.match(/"id" int4 NOT NULL/)
            ddl.should.match(/"name" varchar\(255\)/)
            ddl.should.match(/"role_id" int4/)
            ddl.should.match(/CONSTRAINT "users_pkey" PRIMARY KEY \("id"\)/)
            ddl.should.match(/CREATE INDEX "users_name_idx" ON "public"\."users" \("name"\)/)
            ddl.should.match(/CREATE TABLE "public"\."roles"/)
            ddl.should.match(/"id" int4 NOT NULL/)
            ddl.should.match(/"name" varchar\(100\)/)
            ddl.should.match(/CONSTRAINT "roles_pkey" PRIMARY KEY \("id"\)/)
            ddl.should.match(/COMMENT ON COLUMN "public"\."users"\."id" IS 'User ID'/)
        })
    })

    describe('getTablesHints', function () {
        let app, team, databaseId
        beforeEach(function () {
            app = {
                tables: {
                    query: sinon.stub()
                },
                config: {
                    tables: {
                        driver: { type: 'postgres-supavisor' }
                    }
                }
            }
            team = { id: 'team1' }
            databaseId = 'db1'
        })

        it('should call app.tables.query with correct queries and return DDL', async function () {
            // Setup fake query results
            app.tables.query.onCall(0).resolves({
                rows: [
                    { table_schema: 'public', table_name: 'users', column_name: 'id', udt_name: 'int4', is_nullable: 'NO', column_default: null, table_type: 'BASE TABLE', character_maximum_length: null }
                ]
            })
            app.tables.query.onCall(1).resolves({
                rows: [
                    { table_schema: 'public', table_name: 'users', column_name: 'id' }
                ]
            })
            app.tables.query.onCall(2).resolves({ rows: [] }) // fks
            app.tables.query.onCall(3).resolves({ rows: [] }) // indexes
            app.tables.query.onCall(4).resolves({ rows: [] }) // comments

            const ddl = await assistant.getTablesHints(app, team, databaseId)
            ddl.should.match(/CREATE TABLE/)
            app.tables.query.callCount.should.equal(5)
        })

        it('should throw if driver type is not supported', async function () {
            app.config.tables.driver.type = 'sqlite'
            app.tables.query.resolves({ rows: [] })
            await assistant.getTablesHints(app, team, databaseId).should.be.rejectedWith('Database Context is not supported for tables driver type')
        })
    })
})
