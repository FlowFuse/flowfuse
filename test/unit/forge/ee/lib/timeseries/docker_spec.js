const fs = require('fs/promises')
const os = require('os')
const path = require('path')

const should = require('should')

const docker = require('../../../../../../forge/ee/lib/timeseries/drivers/docker.js')

const team = { hashid: 'TeamHash1' }
const credentials = { httpUser: 't_dockertest01', httpPassword: 'http-pass-1', pgUser: 't_dockertest01', pgPassword: 'pg-pass-1' }
const tier = { cpu: '1', memory: '1g' }

function fakeApp () {
    return { config: {}, log: { info () {}, warn () {}, error () {} } }
}

describe('Timeseries: Docker driver', function () {
    describe('memory sizes', function () {
        it('parses the units tiers use', function () {
            docker._parseMemory('2g').should.equal(2 * 1024 ** 3)
            docker._parseMemory('2Gi').should.equal(2 * 1024 ** 3)
            docker._parseMemory('512m').should.equal(512 * 1024 ** 2)
            docker._parseMemory(1024).should.equal(1024)
        })

        it('rejects anything else', function () {
            should(() => docker._parseMemory('lots')).throw(/Invalid memory size/)
        })
    })

    // Runs against the local Docker daemon: TIMESERIES_DOCKER_TEST=1 npx mocha <this file>
    describe('against Docker', function () {
        const enabled = process.env.TIMESERIES_DOCKER_TEST === '1'
        const database = { meta: { slug: 'dockertest01' }, tier: 'small', image: null, getCredentials: () => currentCredentials }
        let currentCredentials = credentials
        let Docker
        let client
        let network
        let vhostDir
        let pgbouncerDir

        async function questdbAnswers (user, password, query = 'select 1') {
            const container = client.getContainer('ts-dockertest01')
            const auth = Buffer.from(`${user}:${password}`).toString('base64')
            // No curl in the image: send the request with bash's /dev/tcp
            const request = `GET /exec?query=${encodeURIComponent(query).replace(/%/g, '%%')} HTTP/1.0\\r\\nAuthorization: Basic ${auth}\\r\\n\\r\\n`
            const run = await container.exec({
                Cmd: ['bash', '-c', `exec 3<>/dev/tcp/127.0.0.1/9000 && printf "${request}" >&3 && head -1 <&3 | grep -q " 200"`],
                AttachStdout: true,
                AttachStderr: true
            })
            const stream = await run.start({})
            await new Promise(resolve => { stream.on('end', resolve); stream.resume() })
            return (await run.inspect()).ExitCode === 0
        }

        before(async function () {
            if (!enabled) {
                return this.skip()
            }
            this.timeout(60000)
            Docker = require('dockerode')
            client = new Docker()
            network = `ts-driver-test-${Date.now()}`
            await client.createNetwork({ Name: network })
            vhostDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ts-vhost-'))
            pgbouncerDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ts-pgb-'))
            await docker.init(fakeApp(), {
                image: 'questdb/questdb:9.0.1',
                domain: 'ts.example.com',
                network,
                vhostDir,
                tiers: { small: tier },
                readyTimeout: 120000,
                socket: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
            }, { pgbouncer: { configDir: pgbouncerDir } })
        })

        after(async function () {
            if (!enabled) {
                return
            }
            this.timeout(60000)
            await docker.remove(team, database).catch(() => {})
            await client.getNetwork(network).remove().catch(() => {})
            await fs.rm(vhostDir, { recursive: true, force: true })
            await fs.rm(pgbouncerDir, { recursive: true, force: true })
        })

        it('creates a server that answers with its credentials', async function () {
            this.timeout(180000)
            const result = await docker.create(team, database, { credentials, tier })
            result.endpoints.should.eql({
                internal: { host: 'ts-dockertest01', httpPort: 9000, pgPort: 8812 },
                external: { host: 'dockertest01.ts.example.com', httpProtocol: 'http', httpPort: 80 }
            })
            ;(await docker.status(team, database)).should.equal('running')
            ;(await questdbAnswers(credentials.httpUser, credentials.httpPassword)).should.be.true()
            ;(await questdbAnswers(credentials.httpUser, 'wrong')).should.be.false()

            const info = await client.getContainer('ts-dockertest01').inspect()
            info.Config.Env.should.containEql('VIRTUAL_HOST=dockertest01.ts.example.com')
            info.Config.Labels['flowfuse.com/team'].should.equal('TeamHash1')
            info.HostConfig.Memory.should.equal(1024 ** 3)
            info.HostConfig.RestartPolicy.Name.should.equal('unless-stopped')

            const vhost = await fs.readFile(path.join(vhostDir, 'dockertest01.ts.example.com_location'), 'utf8')
            vhost.should.containEql('return 404;')
            vhost.should.containEql('^/(write|api/v2/write|ping)$')
        })

        it('suspends and resumes the server', async function () {
            this.timeout(180000)
            await docker.suspend(team, database)
            ;(await docker.status(team, database)).should.equal('stopped')
            await docker.resume(team, database)
            ;(await docker.status(team, database)).should.equal('running')
        })

        it('resizes the container', async function () {
            await docker.resize(team, database, { cpu: '1', memory: '1536m' })
            const info = await client.getContainer('ts-dockertest01').inspect()
            info.HostConfig.Memory.should.equal(1536 * 1024 ** 2)
        })

        it('rotates credentials by recreating the container on the same volume', async function () {
            this.timeout(180000)
            const rotated = { ...credentials, httpPassword: 'http-pass-2', pgPassword: 'pg-pass-2' }
            await docker.rotateCredentials(team, database, rotated)
            currentCredentials = rotated
            ;(await questdbAnswers(rotated.httpUser, 'http-pass-2')).should.be.true()
            ;(await questdbAnswers(rotated.httpUser, 'http-pass-1')).should.be.false()
        })

        it('lists the servers it created by their slug', async function () {
            ;(await docker.list()).should.containEql('dockertest01')
        })

        it('upgrades by recreating the container on the same volume with the new image', async function () {
            this.timeout(240000)
            const volumeBefore = await client.getVolume('ts-dockertest01').inspect()
            const idBefore = (await client.getContainer('ts-dockertest01').inspect()).Id
            await docker.upgrade(team, database, 'questdb/questdb:9.0.1')
            const info = await client.getContainer('ts-dockertest01').inspect()
            info.Id.should.not.equal(idBefore)
            info.Config.Image.should.equal('questdb/questdb:9.0.1')
            info.Config.Labels['flowfuse.com/timeseries'].should.equal('dockertest01')
            ;(await client.getVolume('ts-dockertest01').inspect()).CreatedAt.should.equal(volumeBefore.CreatedAt)
            ;(await questdbAnswers(currentCredentials.httpUser, currentCredentials.httpPassword)).should.be.true()
        })

        it('leaves the server running when the new image cannot be pulled', async function () {
            this.timeout(240000)
            await docker.upgrade(team, database, 'questdb/questdb:no-such-tag').should.be.rejected()
            ;(await docker.status(team, database)).should.equal('running')
            const info = await client.getContainer('ts-dockertest01').inspect()
            info.Config.Image.should.equal('questdb/questdb:9.0.1')
        })

        it('keeps the existing volume when recreating a missing container fails', async function () {
            this.timeout(240000)
            ;(await questdbAnswers(currentCredentials.httpUser, currentCredentials.httpPassword, 'create table marker (x int)')).should.be.true()
            await client.getContainer('ts-dockertest01').remove({ force: true })
            ;(await docker.status(team, database)).should.equal('missing')
            await docker.create(team, { ...database, image: 'questdb/questdb:no-such-tag' }, { credentials: currentCredentials, tier }).should.be.rejected()
            await client.getVolume('ts-dockertest01').inspect()
            await docker.create(team, database, { credentials: currentCredentials, tier })
            ;(await questdbAnswers(currentCredentials.httpUser, currentCredentials.httpPassword, 'select count() from marker')).should.be.true()
        })

        it('writes the PgBouncer team list into the shared directory', async function () {
            await docker.writePgbouncer({ databases: '[databases]\n', userlist: '' })
            ;(await fs.readdir(pgbouncerDir)).sort().should.eql(['databases.ini', 'userlist.txt'])
        })

        it('removes the container, volume and nginx file', async function () {
            this.timeout(60000)
            await docker.remove(team, database)
            ;(await docker.status(team, database)).should.equal('missing')
            await client.getVolume('ts-dockertest01').inspect().should.be.rejectedWith({ statusCode: 404 })
            await fs.access(path.join(vhostDir, 'dockertest01.ts.example.com_location')).should.be.rejected()
        })
    })
})
