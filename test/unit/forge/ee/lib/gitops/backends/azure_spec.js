const fs = require('node:fs/promises')
const path = require('node:path')

const proxyquire = require('proxyquire')
const sinon = require('sinon')

require('should')

const MODULE = '../../../../../../../forge/ee/lib/gitops/backends/azure'
const REPO_URL = 'https://dev.azure.com/org/proj/_git/repo'

describe('Azure git backend', function () {
    let cloneStub, execFileStub, exportSnapshotStub, snapshotExportStub, axiosStub

    const baseOptions = { pipeline: { name: 'My Pipeline' }, user: { username: 'alice' } }

    function loadBackend () {
        const backend = proxyquire(MODULE, {
            'node:child_process': { execFile: execFileStub },
            axios: { get: axiosStub },
            './utils': { cloneRepository: cloneStub }
        })
        const app = {
            db: {
                controllers: { Snapshot: { exportSnapshot: exportSnapshotStub } },
                views: { ProjectSnapshot: { snapshotExport: snapshotExportStub } }
            },
            config: { domain: 'example.com' }
        }
        return backend.init(app)
    }

    beforeEach(function () {
        cloneStub = sinon.stub().resolves()
        execFileStub = sinon.stub().callsFake((file, args, opts, cb) => cb(null, { stdout: '', stderr: '' }))
        axiosStub = sinon.stub().resolves({ data: { authenticatedUser: { customDisplayName: 'Alice' } } })
        exportSnapshotStub = sinon.stub().resolves({ flows: [] })
        snapshotExportStub = sinon.stub().returns({ name: 'snap', settings: {} })
    })

    describe('pushToRepository', function () {
        it('writes the snapshot to a nested path under a leading separator and stages it', async function () {
            let written
            cloneStub.callsFake(async (url, branch, workingDir) => {
                await fs.mkdir(path.join(workingDir, 'flows'))
            })
            execFileStub.callsFake((file, args, opts, cb) => {
                if (args[0] === 'add') {
                    written = args[1]
                }
                cb(null, { stdout: '', stderr: '' })
            })
            const backend = await loadBackend()
            await backend.pushToRepository({ url: REPO_URL, token: 'tok', credentialSecret: 's', path: '/flows/snap.json' }, {}, baseOptions)
            written.should.match(/flows[\\/]snap\.json$/)
            execFileStub.getCalls().map(c => c.args[1][0]).should.containEql('push')
        })

        it('rejects a path that escapes the clone', async function () {
            const backend = await loadBackend()
            await backend.pushToRepository({ url: REPO_URL, token: 'tok', credentialSecret: 's', path: '../../etc/passwd' }, {}, baseOptions)
                .should.be.rejectedWith('Invalid repository path')
            execFileStub.getCalls().map(c => c.args[1][0]).should.not.containEql('push')
        })
    })

    describe('pullFromRepository', function () {
        it('reads the snapshot from a path with a leading separator', async function () {
            cloneStub.callsFake(async (url, branch, workingDir) => {
                await fs.mkdir(path.join(workingDir, 'flows'))
                await fs.writeFile(path.join(workingDir, 'flows', 'snap.json'), JSON.stringify({ name: 'snap' }))
            })
            const backend = await loadBackend()
            const result = await backend.pullFromRepository({ url: REPO_URL, token: 't', credentialSecret: 's', path: '/flows/snap.json' })
            result.name.should.equal('snap')
        })

        it('rejects a path that escapes the clone', async function () {
            const backend = await loadBackend()
            await backend.pullFromRepository({ url: REPO_URL, token: 't', credentialSecret: 's', path: '../../etc/passwd' })
                .should.be.rejectedWith('Invalid repository path')
        })

        it('rejects a snapshot path that is a symlink', async function () {
            cloneStub.callsFake(async (url, branch, workingDir) => {
                await fs.symlink('/etc/passwd', path.join(workingDir, 'snapshot.json'))
            })
            const backend = await loadBackend()
            await backend.pullFromRepository({ url: REPO_URL, token: 't', credentialSecret: 's' })
                .should.be.rejectedWith('Invalid repository path')
        })
    })
})
