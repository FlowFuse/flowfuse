const should = require('should')

const { parseCallToAction, parseLinkUrl, parseVideoReference } = require('../../../../forge/lib/announcements')

describe('announcements.js', function () {
    describe('parseVideoReference', function () {
        it('accepts a standard youtube watch url', function () {
            parseVideoReference('https://www.youtube.com/watch?v=6l1ymjo80Vo')
                .should.eql({ provider: 'youtube', id: '6l1ymjo80Vo' })
        })

        it('accepts a watch url with extra query parameters', function () {
            parseVideoReference('https://www.youtube.com/watch?v=6l1ymjo80Vo&t=42s&list=PL123')
                .should.eql({ provider: 'youtube', id: '6l1ymjo80Vo' })
        })

        it('accepts a youtu.be share url', function () {
            parseVideoReference('https://youtu.be/6l1ymjo80Vo')
                .should.eql({ provider: 'youtube', id: '6l1ymjo80Vo' })
        })

        it('accepts embed, shorts and live paths', function () {
            parseVideoReference('https://www.youtube.com/embed/6l1ymjo80Vo').should.have.property('id', '6l1ymjo80Vo')
            parseVideoReference('https://www.youtube.com/shorts/6l1ymjo80Vo').should.have.property('id', '6l1ymjo80Vo')
            parseVideoReference('https://www.youtube.com/live/6l1ymjo80Vo').should.have.property('id', '6l1ymjo80Vo')
        })

        it('accepts a bare video id', function () {
            parseVideoReference('6l1ymjo80Vo').should.eql({ provider: 'youtube', id: '6l1ymjo80Vo' })
        })

        it('rejects an empty or missing value', function () {
            should.not.exist(parseVideoReference(''))
            should.not.exist(parseVideoReference(undefined))
            should.not.exist(parseVideoReference(null))
            should.not.exist(parseVideoReference({ id: 'x' }))
        })

        it('rejects other video hosts', function () {
            should.not.exist(parseVideoReference('https://vimeo.com/123456789'))
            should.not.exist(parseVideoReference('https://evil.example.com/watch?v=6l1ymjo80Vo'))
        })

        it('rejects a non-http scheme', function () {
            should.not.exist(parseVideoReference('javascript:alert(1)//youtube.com/watch?v=6l1ymjo80Vo'))
        })

        it('rejects a youtube url with no usable video id', function () {
            should.not.exist(parseVideoReference('https://www.youtube.com/@flowfuse'))
            should.not.exist(parseVideoReference('https://www.youtube.com/watch?v=tooshort'))
        })
    })

    describe('parseCallToAction', function () {
        it('accepts a label with an https url', function () {
            parseCallToAction({ label: 'Talk to sales', url: 'https://flowfuse.com/contact/' })
                .should.eql({ label: 'Talk to sales', url: 'https://flowfuse.com/contact/' })
        })

        it('accepts a relative in-app url', function () {
            parseCallToAction({ label: 'Open billing', url: '/team/demo/billing' })
                .should.eql({ label: 'Open billing', url: '/team/demo/billing' })
        })

        it('trims the label', function () {
            parseCallToAction({ label: '  Book a call  ', url: 'https://flowfuse.com' })
                .should.have.property('label', 'Book a call')
        })

        it('rejects a partial call to action', function () {
            should.not.exist(parseCallToAction({ label: 'Talk to sales' }))
            should.not.exist(parseCallToAction({ url: 'https://flowfuse.com' }))
            should.not.exist(parseCallToAction({ label: '   ', url: 'https://flowfuse.com' }))
            should.not.exist(parseCallToAction(null))
        })

        it('rejects a non-http scheme', function () {
            should.not.exist(parseCallToAction({ label: 'Click', url: 'javascript:alert(1)' }))
            should.not.exist(parseCallToAction({ label: 'Click', url: 'data:text/html,<script>alert(1)</script>' }))
        })

        it('rejects a url that only looks like an in-app path', function () {
            should.not.exist(parseCallToAction({ label: 'Click', url: '//evil.example.com/phish' }))
            should.not.exist(parseCallToAction({ label: 'Click', url: '/\\evil.example.com/phish' }))
        })
    })

    describe('parseLinkUrl', function () {
        it('accepts http and https', function () {
            parseLinkUrl('https://flowfuse.com/blog/').should.equal('https://flowfuse.com/blog/')
            parseLinkUrl('http://localhost:3000/x').should.equal('http://localhost:3000/x')
        })

        it('accepts a path within the platform', function () {
            parseLinkUrl('/team/demo/billing').should.equal('/team/demo/billing')
        })

        it('rejects a scheme that can execute', function () {
            should.not.exist(parseLinkUrl('javascript:alert(document.cookie)'))
            should.not.exist(parseLinkUrl('data:text/html,<script>alert(1)</script>'))
            should.not.exist(parseLinkUrl('vbscript:msgbox(1)'))
        })

        it('rejects an off-platform target disguised as a path', function () {
            // Browsers resolve both of these against another origin
            should.not.exist(parseLinkUrl('//evil.example.com/phish'))
            should.not.exist(parseLinkUrl('/\\evil.example.com/phish'))
        })

        it('rejects anything that is neither', function () {
            should.not.exist(parseLinkUrl(''))
            should.not.exist(parseLinkUrl('   '))
            should.not.exist(parseLinkUrl('not a url'))
            should.not.exist(parseLinkUrl(undefined))
        })
    })
})
