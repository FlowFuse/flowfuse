const fs = require('fs/promises')
const os = require('os')
const path = require('path')

/// <reference types="should" />
const should = require('should')

const pgbouncer = require('../../../../../../forge/ee/lib/timeseries/pgbouncer.js')

describe('Timeseries: PgBouncer team list', function () {
    const teamA = { database: 'abc123', host: 'ts-abc123', user: 't_abc123', password: 'secret-a' }
    const teamB = { database: 'xyz789', host: 'ts-xyz789', user: 't_xyz789', password: 'secret-b' }

    describe('render', function () {
        it('renders one database line and one user per team server', function () {
            const files = pgbouncer.render([teamA, teamB])
            files.databases.should.equal([
                '[databases]',
                'abc123 = host=ts-abc123 port=8812 dbname=qdb',
                'xyz789 = host=ts-xyz789 port=8812 dbname=qdb',
                ''
            ].join('\n'))
            files.userlist.should.equal('"t_abc123" "secret-a"\n"t_xyz789" "secret-b"\n')
        })

        it('renders an empty team list', function () {
            const files = pgbouncer.render([])
            files.databases.should.equal('[databases]\n')
            files.userlist.should.equal('')
        })

        it('sorts by database so the same team list gives identical files', function () {
            pgbouncer.render([teamB, teamA]).should.deepEqual(pgbouncer.render([teamA, teamB]))
        })

        it('never forces a user or password on the server connection', function () {
            const files = pgbouncer.render([teamA, teamB])
            files.databases.should.not.match(/user=/)
            files.databases.should.not.match(/password=/)
        })

        it('applies the default and per-team connection limits', function () {
            const files = pgbouncer.render([teamA, { ...teamB, maxConnections: 3 }], { maxConnectionsPerTeam: 10 })
            files.databases.should.match(/^abc123 = .* max_db_connections=10$/m)
            files.databases.should.match(/^xyz789 = .* max_db_connections=3$/m)
        })

        it('uses a custom port and dbname', function () {
            const files = pgbouncer.render([{ ...teamA, port: 18812, dbname: 'other' }])
            files.databases.should.match(/^abc123 = host=ts-abc123 port=18812 dbname=other$/m)
        })

        it('doubles double quotes in passwords', function () {
            const files = pgbouncer.render([{ ...teamA, password: 'a"b' }])
            files.userlist.should.equal('"t_abc123" "a""b"\n')
        })

        it('refuses a user name shared by two team servers', function () {
            should(() => pgbouncer.render([teamA, { ...teamB, user: teamA.user }])).throw(/more than one team server/)
        })

        it('refuses a duplicate database', function () {
            should(() => pgbouncer.render([teamA, { ...teamB, database: teamA.database }])).throw(/Duplicate database/)
        })

        const invalid = [
            ['a database name with spaces', { database: 'abc 123' }, /Invalid database name/],
            ['a database name that starts a new line', { database: 'abc\nevil = host=x' }, /Invalid database name/],
            ['a user name with a quote', { user: 't_"abc' }, /Invalid user name/],
            ['a host with a space', { host: 'ts-abc user=admin' }, /Invalid host/],
            ['a password with a newline', { password: 'a\n"t_evil" "x"' }, /Invalid password/],
            ['an empty password', { password: '' }, /Invalid password/],
            ['a port out of range', { port: 70000 }, /Invalid port/],
            ['a connection limit of zero', { maxConnections: 0 }, /Invalid connection limit/]
        ]
        for (const [label, change, error] of invalid) {
            it(`refuses ${label}`, function () {
                should(() => pgbouncer.render([{ ...teamA, ...change }])).throw(error)
            })
        }
    })

    describe('writeToDirectory', function () {
        let dir

        beforeEach(async function () {
            dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ts-pgbouncer-'))
        })

        afterEach(async function () {
            await fs.rm(dir, { recursive: true, force: true })
        })

        it('writes both files, readable by the PgBouncer user but writable only by forge', async function () {
            const files = pgbouncer.render([teamA])
            await pgbouncer.writeToDirectory(dir, files)
            ;(await fs.readFile(path.join(dir, 'databases.ini'), 'utf8')).should.equal(files.databases)
            ;(await fs.readFile(path.join(dir, 'userlist.txt'), 'utf8')).should.equal(files.userlist)
            const mode = (await fs.stat(path.join(dir, 'userlist.txt'))).mode & 0o777
            mode.should.equal(0o644)
        })

        it('replaces the previous team list and leaves no temporary files', async function () {
            await pgbouncer.writeToDirectory(dir, pgbouncer.render([teamA, teamB]))
            await pgbouncer.writeToDirectory(dir, pgbouncer.render([teamB]))
            ;(await fs.readFile(path.join(dir, 'databases.ini'), 'utf8')).should.not.match(/abc123/)
            ;(await fs.readdir(dir)).sort().should.deepEqual(['databases.ini', 'userlist.txt'])
        })

        it('creates the directory when missing', async function () {
            const nested = path.join(dir, 'nested')
            await pgbouncer.writeToDirectory(nested, pgbouncer.render([]))
            ;(await fs.readdir(nested)).sort().should.deepEqual(['databases.ini', 'userlist.txt'])
        })
    })

    describe('toSecretData', function () {
        it('base64-encodes both files for the Kubernetes Secret', function () {
            const files = pgbouncer.render([teamA])
            const data = pgbouncer.toSecretData(files)
            Buffer.from(data['databases.ini'], 'base64').toString().should.equal(files.databases)
            Buffer.from(data['userlist.txt'], 'base64').toString().should.equal(files.userlist)
        })
    })
})
