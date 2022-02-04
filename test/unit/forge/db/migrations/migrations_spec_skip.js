// This unit test is ignored. It was written to verify each migration could be
// applied in turn to a database and that the result looked correct.
// However, limitations of the Sequelize ORM breaks some of the inital assumptions
// about how we could test the result of each migration from a purely analytical
// look at the schema of the resulting tables.
//
// There is a lot of potentially useful logic in this test that I'm loathe to
// throw away. We may think better of it in the future and this file will then
// at least have existed in the git history.
//
// ---
//
// This checks the models defined in forge/db/models generates
// tables that match what the migrations generate
//
// If there is a mismatch, it means the models have been changed
// but there is no migration file provided to handle it.

const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
// const Forge = FF_UTIL.require('forge/forge.js')
// const { sha256 } = FF_UTIL.require('forge/db/utils')
const { Sequelize } = require('sequelize')
const path = require('path')
const fs = require('fs').promises

const MIGRATIONS_DIR = FF_UTIL.resolve('forge/db/migrations')

describe('Validate migrations', async function () {
    let migrationFiles
    let migrationApp

    // async function getTableSchemaHashes (q) {
    //     let tables = await q.showAllSchemas()
    //     tables = tables.map(t => t.name)
    //     tables.sort()
    //     const result = {}
    //
    //     for (let i = 0; i < tables.length; i++) {
    //         const schema = await q.describeTable(tables[i])
    //         const cols = Object.keys(schema)
    //         cols.sort()
    //         const fingerPrint = cols.map(c => JSON.stringify(schema[c])).join('')
    //         result[tables[i]] = sha256(fingerPrint)
    //     }
    //     return result
    // }

    before(async function () {
        // Create a blank database to apply migrations to
        migrationApp = new Sequelize({
            dialect: 'sqlite',
            storage: ':memory:',
            logging: false
        })
        await migrationApp.sync()

        const queryInterface = migrationApp.getQueryInterface()

        // Get the list of migration files
        migrationFiles = await fs.readdir(MIGRATIONS_DIR)
        if (migrationFiles.length === 0) {
            throw new Error('No migration files found in', MIGRATIONS_DIR)
        }
        migrationFiles = migrationFiles.filter(name => /^\d\d.*\.js$/.test(name))
        migrationFiles.sort()

        // const accumulatedVersions = {}
        let skipOnError = false

        migrationFiles.forEach(file => {
            describe(`Test migration ${file}`, function () {
                let migration
                // let expectedPostVersions

                before(async function () {
                    const pathToFile = path.relative(__dirname, path.join(MIGRATIONS_DIR, file))
                    migration = require(pathToFile)
                    // expectedPostVersions = { ...accumulatedVersions, ...(migration.versions || {}) }
                    if (skipOnError) {
                        this.skip()
                    }
                })

                it('Applies cleanly', async function () {
                    await migration.up(queryInterface)
                })

                // it('Table versions match', async function () {
                //     const postVersions = await getTableSchemaHashes(queryInterface)
                //
                //     const expectedTables = Object.keys(expectedPostVersions)
                //     const actualTables = Object.keys(postVersions)
                //
                //     expectedTables.length.should.eql(actualTables.length)
                //
                //     for (let i = 0; i < expectedTables.length; i++) {
                //         const tableName = expectedTables[i]
                //         expectedPostVersions[tableName].should.eql(postVersions[tableName], `Table '${tableName}' version mismatch`)
                //     }
                // })

                it('Downgrades cleanly', async function () {
                    if (migration.down) {
                        await migration.down(queryInterface)
                        // accumulatedVersions still contains the hashes
                        // from before this migration was applied.
                        // We can compare against that to check the migration
                        // has been removed.

                        // // Get the hashes following migration.down
                        // const postDownVersions = await getTableSchemaHashes(queryInterface)
                        //
                        // const expectedTables = Object.keys(accumulatedVersions)
                        // const actualTables = Object.keys(postDownVersions)
                        //
                        // expectedTables.length.should.eql(actualTables.length)
                        //
                        // for (let i = 0; i < expectedTables.length; i++) {
                        //     const tableName = expectedTables[i]
                        //     accumulatedVersions[tableName].should.eql(postDownVersions[tableName], `Table '${tableName}' version mismatch after applying migration.down`)
                        // }

                        // Reapply up for the next test
                        await migration.up(queryInterface)
                    }
                })

                after(function () {
                    if (this.currentTest.state === 'failed') {
                        skipOnError = true
                    }
                    // accumulatedVersions = expectedPostVersions
                })
            })
        })
        // describe('Check models against migrations', function () {
        //     let forgeApp
        //     it('Final migration matches models', async function () {
        //         // Initialise an instance of Forge using the built-in models
        //         forgeApp = await Forge({
        //             config: {
        //                 db: {
        //                     type: 'sqlite',
        //                     storage: ':memory:',
        //                     migrations: {
        //                         auto: false,
        //                         skipCheck: true
        //                     }
        //                 },
        //                 driver: { type: 'stub' },
        //                 email: { enabled: false }
        //             }
        //         })
        //         const modelVersions = await getTableSchemaHashes(forgeApp.db.sequelize.getQueryInterface())
        //         const expectedTables = Object.keys(accumulatedVersions)
        //         const actualTables = Object.keys(modelVersions)
        //
        //         expectedTables.length.should.eql(actualTables.length)
        //
        //         for (let i = 0; i < expectedTables.length; i++) {
        //             const tableName = expectedTables[i]
        //             accumulatedVersions[tableName].should.eql(modelVersions[tableName], `Table '${tableName}' version mismatch betweem model and migrations`)
        //         }
        //     })
        // })
    })
    it('Generate tests', async function () { })
})
