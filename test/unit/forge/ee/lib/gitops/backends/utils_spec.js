const proxyquire = require('proxyquire')
const sinon = require('sinon')

require('should')

const MODULE = '../../../../../../../forge/ee/lib/gitops/backends/utils'

describe('gitops cloneRepository', function () {
    let execFileStub
    const url = new URL('https://git.example.com/o/r.git')

    function load () {
        return proxyquire(MODULE, {
            'node:child_process': { execFile: execFileStub }
        }).cloneRepository
    }

    function rejectWith (stderr) {
        execFileStub.callsFake((file, args, opts, cb) => {
            const err = new Error('boom'); err.stdout = ''; err.stderr = stderr; cb(err)
        })
    }

    beforeEach(function () {
        execFileStub = sinon.stub().callsFake((file, args, opts, cb) => cb(null, { stdout: '', stderr: '' }))
    })

    it('runs git clone with the expected arguments', async function () {
        const cloneRepository = load()
        await cloneRepository(url, 'main', '/tmp/x')
        execFileStub.calledOnce.should.be.true()
        execFileStub.firstCall.args[0].should.equal('git')
        execFileStub.firstCall.args[1].should.containDeep(['clone', '-b', 'main', '--single-branch'])
    })

    it('maps unable-to-access to Permission denied', async function () {
        rejectWith('fatal: unable to access')
        const cloneRepository = load()
        let caught
        try { await cloneRepository(url, 'main', '/tmp/x') } catch (err) { caught = err }
        caught.message.should.equal('Permission denied')
        caught.code.should.equal('invalid_token')
    })

    it('maps a missing remote branch to Branch not found', async function () {
        rejectWith('fatal: Remote branch main not found')
        const cloneRepository = load()
        let caught
        try { await cloneRepository(url, 'main', '/tmp/x') } catch (err) { caught = err }
        caught.message.should.equal('Branch not found')
        caught.code.should.equal('invalid_branch')
    })

    it('surfaces a generic fatal clone error', async function () {
        rejectWith('fatal: something broke')
        const cloneRepository = load()
        await cloneRepository(url, 'main', '/tmp/x')
            .should.be.rejectedWith('Failed to clone repository: something broke')
    })
})

describe('gitops resolveRepoFile', function () {
    const os = require('node:os')
    const realFs = require('node:fs/promises')
    const nodePath = require('node:path')
    const { resolveRepoFile } = require('../../../../../../../forge/ee/lib/gitops/backends/utils')
    let dir

    beforeEach(async function () {
        dir = await realFs.mkdtemp(nodePath.join(os.tmpdir(), 'ff-gitops-test-'))
        await realFs.writeFile(nodePath.join(dir, 'snapshot.json'), '{}')
    })

    afterEach(async function () {
        await realFs.rm(dir, { recursive: true, force: true })
    })

    it('resolves a file inside the working dir', async function () {
        const resolved = await resolveRepoFile(dir, 'snapshot.json')
        resolved.should.equal(await realFs.realpath(nodePath.join(dir, 'snapshot.json')))
    })

    it('rejects an absolute path', async function () {
        await resolveRepoFile(dir, '/etc/passwd').should.be.rejectedWith('Invalid repository path')
    })

    it('rejects a traversal path', async function () {
        await resolveRepoFile(dir, '../../etc/passwd').should.be.rejectedWith('Invalid repository path')
    })

    it('rejects a symlinked leaf', async function () {
        await realFs.symlink('/etc/passwd', nodePath.join(dir, 'link.json'))
        await resolveRepoFile(dir, 'link.json').should.be.rejectedWith('Invalid repository path')
    })

    it('rejects a path through a symlinked directory', async function () {
        await realFs.symlink(os.tmpdir(), nodePath.join(dir, 'out'))
        await resolveRepoFile(dir, nodePath.join('out', 'snapshot.json')).should.be.rejectedWith('Invalid repository path')
    })
})
