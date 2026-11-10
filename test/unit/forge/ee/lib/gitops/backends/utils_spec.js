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

    it('treats a leading separator as the repository root', async function () {
        const expected = await realFs.realpath(nodePath.join(dir, 'snapshot.json'))
        ;(await resolveRepoFile(dir, '/snapshot.json')).should.equal(expected)
        ;(await resolveRepoFile(dir, '//snapshot.json')).should.equal(expected)
        ;(await resolveRepoFile(dir, '/flows/snapshot.json')).should.equal(nodePath.join(await realFs.realpath(dir), 'flows', 'snapshot.json'))
    })

    it('rejects a path that resolves to the clone root', async function () {
        for (const p of ['', '/', '.', './']) {
            await resolveRepoFile(dir, p).should.be.rejectedWith('Invalid repository path')
        }
    })

    it('rejects a traversal after a leading separator', async function () {
        await resolveRepoFile(dir, '/../etc/passwd').should.be.rejectedWith('Invalid repository path')
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

describe('gitops validateRepoUrl', function () {
    const { validateRepoUrl } = require('../../../../../../../forge/ee/lib/gitops/backends/utils')

    it('accepts an exact allowed host', function () {
        const url = validateRepoUrl('https://github.com/o/r.git', { allowedHosts: ['github.com'] })
        url.hostname.should.equal('github.com')
    })

    it('accepts any https host when no allow-list is given', function () {
        const url = validateRepoUrl('https://git.example.com/o/r.git')
        url.hostname.should.equal('git.example.com')
    })

    it('rejects a lookalike host that only shares a prefix', function () {
        (() => validateRepoUrl('https://github.com.evil.test/o/r.git', { allowedHosts: ['github.com'] })).should.throw()
    })

    it('rejects a userinfo host that redirects the credential on a pinned-host backend', function () {
        (() => validateRepoUrl('https://github.com@evil.test/o/r.git', { allowedHosts: ['github.com'] })).should.throw()
    })

    it('allows embedded userinfo for a generic repo (the backend overwrites it)', function () {
        const url = validateRepoUrl('https://user@bitbucket.org/o/r.git')
        url.hostname.should.equal('bitbucket.org')
    })

    it('rejects a non-https URL', function () {
        (() => validateRepoUrl('http://git.example.com/o/r.git')).should.throw()
    })

    it('rejects a malformed URL', function () {
        (() => validateRepoUrl('not a url')).should.throw()
    })
})
