const should = require('should') // eslint-disable-line

const { localPath } = require('../../../../forge/lib/redirect')

describe('Redirect', function () {
    describe('localPath', function () {
        it('returns paths on this site unchanged', function () {
            localPath('/').should.equal('/')
            localPath('/team/abc').should.equal('/team/abc')
            localPath('/team/abc?tab=members#top').should.equal('/team/abc?tab=members#top')
        })

        it('falls back to the root for anything that is not a local path', function () {
            localPath('//example.com/x').should.equal('/')
            localPath('/\\example.com/x').should.equal('/')
            localPath('/\t/example.com').should.equal('/')
            localPath('/team\n/abc').should.equal('/')
            localPath('https://example.com').should.equal('/')
            localPath('team/abc').should.equal('/')
            localPath('').should.equal('/')
            localPath(undefined).should.equal('/')
            localPath(null).should.equal('/')
        })
    })
})
