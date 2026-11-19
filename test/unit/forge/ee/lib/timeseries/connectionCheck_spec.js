const http = require('http')
const net = require('net')

const should = require('should')

const connectionCheck = require('../../../../../../forge/ee/lib/timeseries/connectionCheck.js')

describe('Timeseries: external connection check', function () {
    describe('resolveAllowed', function () {
        const refused = ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:8.8.8.8']
        for (const address of refused) {
            it(`refuses ${address}`, async function () {
                await connectionCheck.resolveAllowed(address, false).should.be.rejectedWith({ code: 'private_address_not_allowed' })
            })
        }

        it('allows a private address when private networks are allowed', async function () {
            const address = await connectionCheck.resolveAllowed('127.0.0.1', true)
            address.should.equal('127.0.0.1')
        })

        it('allows a public address', async function () {
            const address = await connectionCheck.resolveAllowed('8.8.8.8', false)
            address.should.equal('8.8.8.8')
        })

        it('reports a host that does not resolve', async function () {
            await connectionCheck.resolveAllowed('does-not-exist.invalid', true).should.be.rejectedWith({ code: 'host_not_found' })
        })
    })

    describe('check', function () {
        let server
        let port
        let lastAuth

        before(async function () {
            server = http.createServer((req, res) => {
                lastAuth = req.headers.authorization
                if (req.url !== '/ping') {
                    res.writeHead(404).end()
                } else if (req.headers.authorization !== 'Basic ' + Buffer.from('writer:secret').toString('base64')) {
                    res.writeHead(401).end()
                } else {
                    res.writeHead(204).end()
                }
            })
            await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
            port = server.address().port
        })

        after(function () {
            server.close()
        })

        async function freePort () {
            const probe = net.createServer()
            await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
            const { port } = probe.address()
            await new Promise(resolve => probe.close(resolve))
            return port
        }

        it('reports ILP ok with the right credentials and a refused PGWire port', async function () {
            const result = await connectionCheck.check({
                ilp: { protocol: 'http', host: 'localhost', port, authType: 'basic', username: 'writer', password: 'secret' },
                pgwire: { host: 'localhost', port: await freePort(), user: 'u', password: 'p', database: 'qdb' }
            }, { allowPrivateNetworks: true })
            result.ilp.should.eql({ ok: true })
            result.pgwire.should.eql({ ok: false, error: 'connection_refused' })
            lastAuth.should.startWith('Basic ')
        })

        it('reports wrong ILP credentials', async function () {
            const result = await connectionCheck.check({
                ilp: { protocol: 'http', host: 'localhost', port, authType: 'basic', username: 'writer', password: 'wrong' },
                pgwire: { host: 'localhost', port: await freePort(), user: 'u' }
            }, { allowPrivateNetworks: true })
            result.ilp.should.eql({ ok: false, error: 'authentication_failed' })
        })

        it('does not contact a private host unless allowed', async function () {
            lastAuth = undefined
            const result = await connectionCheck.check({
                ilp: { protocol: 'http', host: 'localhost', port, authType: 'basic', username: 'writer', password: 'secret' },
                pgwire: { host: 'localhost', port: 8812, user: 'u' }
            })
            result.ilp.should.eql({ ok: false, error: 'private_address_not_allowed' })
            should.not.exist(lastAuth)
        })
    })
})
