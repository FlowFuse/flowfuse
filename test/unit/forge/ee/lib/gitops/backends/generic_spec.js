const fs = require('node:fs/promises')
const path = require('node:path')

const proxyquire = require('proxyquire')
const sinon = require('sinon')

require('should')

const MODULE = '../../../../../../../forge/ee/lib/gitops/backends/generic'

describe('Generic git backend', function () {
    let cloneStub, execFileStub, exportSnapshotStub, snapshotExportStub, encryptStub, decryptStub

    const baseOptions = { pipeline: { name: 'My Pipeline' }, user: { username: 'alice' } }

    function loadBackend () {
        const generic = proxyquire(MODULE, {
            'node:child_process': { execFile: execFileStub },
            './utils': { cloneRepository: cloneStub },
            '../../../../db/utils': { encryptValue: encryptStub, decryptValue: decryptStub }
        })
        const app = {
            db: {
                controllers: { Snapshot: { exportSnapshot: exportSnapshotStub } },
                views: { ProjectSnapshot: { snapshotExport: snapshotExportStub } }
            },
            config: { domain: 'example.com' }
        }
        return generic.init(app)
    }

    beforeEach(function () {
        cloneStub = sinon.stub().resolves()
        // promisify(execFile) calls (file, args, opts, cb) — default to success
        execFileStub = sinon.stub().callsFake((file, args, opts, cb) => cb(null, { stdout: '', stderr: '' }))
        encryptStub = sinon.stub().returns('ENCRYPTED')
        decryptStub = sinon.stub().returns('DECRYPTED')
        exportSnapshotStub = sinon.stub().resolves({ flows: [] })
        snapshotExportStub = sinon.stub().returns({ name: 'snap', settings: {} })
    })

    describe('pushToRepository', function () {
        it('rejects non-HTTPS urls', async function () {
            const backend = await loadBackend()
            await backend.pushToRepository({ url: 'http://example.com/r.git' }, {}, baseOptions)
                .should.be.rejectedWith('Only HTTPS git URLs are supported')
        })

        it('clones with embedded username/token, then commits and pushes', async function () {
            const backend = await loadBackend()
            await backend.pushToRepository(
                { url: 'https://git.example.com/o/r.git', username: 'bob', token: 'tok', credentialSecret: 's', path: 'snapshot.json' },
                {}, baseOptions
            )
            cloneStub.calledOnce.should.be.true()
            const urlArg = cloneStub.firstCall.args[0]
            urlArg.username.should.equal('bob')
            urlArg.password.should.equal('tok')
            // config x3 + add + commit + push
            execFileStub.callCount.should.equal(6)
            execFileStub.getCalls().map(c => c.args[1][0]).should.containDeep(['config', 'add', 'commit', 'push'])
        })

        it('falls back to x-access-token when no username given', async function () {
            const backend = await loadBackend()
            await backend.pushToRepository(
                { url: 'https://git.example.com/o/r.git', token: 'tok', credentialSecret: 's' },
                {}, baseOptions
            )
            cloneStub.firstCall.args[0].username.should.equal('x-access-token')
        })

        it('writes a CA file and passes GIT_SSL_CAINFO when caCertificate is set', async function () {
            const backend = await loadBackend()
            await backend.pushToRepository(
                { url: 'https://git.example.com/o/r.git', token: 'tok', caCertificate: 'CERT', credentialSecret: 's' },
                {}, baseOptions
            )
            const env = cloneStub.firstCall.args[3]
            env.should.have.property('GIT_SSL_CAINFO')
            env.GIT_SSL_CAINFO.should.match(/-ca\.pem$/)
        })

        it('encrypts the npmrc in the exported snapshot', async function () {
            snapshotExportStub.returns({ name: 'snap', settings: { settings: { palette: { npmrc: 'registry=x' } } } })
            const backend = await loadBackend()
            await backend.pushToRepository(
                { url: 'https://git.example.com/o/r.git', token: 'tok', credentialSecret: 's' },
                {}, baseOptions
            )
            encryptStub.calledOnce.should.be.true()
        })

        it('maps an unable-to-access push failure to invalid_token', async function () {
            execFileStub.callsFake((file, args, opts, cb) => {
                if (args[0] === 'push') {
                    const err = new Error('boom'); err.stdout = ''; err.stderr = 'fatal: unable to access'; return cb(err)
                }
                cb(null, { stdout: '', stderr: '' })
            })
            const backend = await loadBackend()
            let caught
            try {
                await backend.pushToRepository({ url: 'https://git.example.com/o/r.git', token: 'tok', credentialSecret: 's' }, {}, baseOptions)
            } catch (err) { caught = err }
            caught.message.should.equal('Permission denied')
            caught.code.should.equal('invalid_token')
        })

        it('surfaces a fatal push error message', async function () {
            execFileStub.callsFake((file, args, opts, cb) => {
                if (args[0] === 'push') {
                    const err = new Error('boom'); err.stdout = ''; err.stderr = 'fatal: remote rejected'; return cb(err)
                }
                cb(null, { stdout: '', stderr: '' })
            })
            const backend = await loadBackend()
            await backend.pushToRepository({ url: 'https://git.example.com/o/r.git', token: 'tok', credentialSecret: 's' }, {}, baseOptions)
                .should.be.rejectedWith('Failed to push repository: remote rejected')
        })
    })

    describe('pullFromRepository', function () {
        it('rejects non-HTTPS urls', async function () {
            const backend = await loadBackend()
            await backend.pullFromRepository({ url: 'http://example.com/r.git' })
                .should.be.rejectedWith('Only HTTPS git URLs are supported')
        })

        it('throws when the snapshot file is missing', async function () {
            const backend = await loadBackend()
            await backend.pullFromRepository({ url: 'https://git.example.com/o/r.git', token: 't', credentialSecret: 's' })
                .should.be.rejectedWith('Snapshot file not found in repository')
        })

        it('reads and decrypts the snapshot file', async function () {
            const snapshotContent = {
                name: 'snap',
                settings: {
                    env: { SECRET: { hidden: true, $: 'enc' }, PLAIN: { value: 'x' } },
                    settings: { palette: { npmrc: { $: 'encnpm' } } }
                }
            }
            cloneStub.callsFake(async (url, branch, workingDir) => {
                await fs.writeFile(path.join(workingDir, 'snapshot.json'), JSON.stringify(snapshotContent))
            })
            const backend = await loadBackend()
            const result = await backend.pullFromRepository({ url: 'https://git.example.com/o/r.git', token: 't', credentialSecret: 's' })
            result.name.should.equal('snap')
            result.settings.env.SECRET.value.should.equal('DECRYPTED')
            result.settings.env.SECRET.should.not.have.property('$')
            result.settings.settings.palette.npmrc.should.equal('DECRYPTED')
            decryptStub.callCount.should.equal(2)
        })

        it('passes GIT_SSL_CAINFO on pull when caCertificate is set', async function () {
            cloneStub.callsFake(async (url, branch, workingDir) => {
                await fs.writeFile(path.join(workingDir, 'snapshot.json'), JSON.stringify({ name: 'snap' }))
            })
            const backend = await loadBackend()
            await backend.pullFromRepository({ url: 'https://git.example.com/o/r.git', token: 't', caCertificate: 'CERT', credentialSecret: 's' })
            cloneStub.firstCall.args[3].should.have.property('GIT_SSL_CAINFO')
        })
    })
})
