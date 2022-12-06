const should = require('should') // eslint-disable-line

const validate = require('../../../../forge/lib/validate')

describe('Validate', function () {
    describe('isFQDN', function () {
        it('Validates fully qualified domain names made up of labels', async function () {
            validate.isFQDN('example.com').should.be.true()
            validate.isFQDN('project.example.com').should.be.true()
            validate.isFQDN('project.example.customtld').should.be.true()
        })

        it('Allows hyphens outside of the TLD but not at the beginning or end of each label', async function () {
            validate.isFQDN('exam-ple.com').should.be.true()
            validate.isFQDN('the-nested.project.example.com').should.be.true()
            validate.isFQDN('the-nested.pro-ject.example.com').should.be.true()

            validate.isFQDN('project.example.custom-tld').should.be.false()
            validate.isFQDN('project.example-.com').should.be.false()
            validate.isFQDN('project.-example.com').should.be.false()
            validate.isFQDN('-project.-example.com').should.be.false()
            validate.isFQDN('project-.-example.com').should.be.false()
        })

        it('Allows numbers in the labels but not in the TLD', async function () {
            validate.isFQDN('1example.com').should.be.true()
            validate.isFQDN('project1.example.com').should.be.true()

            validate.isFQDN('example.co1').should.be.false()
        })

        it('Only allows labels up to 63 characters long', async function () {
            validate.isFQDN(`${'x'.repeat(63)}.com`).should.be.true()
            validate.isFQDN(`${'x'.repeat(63)}.${'y'.repeat(63)}.com`).should.be.true()
            validate.isFQDN(`${'x'.repeat(63)}.${'y'.repeat(63)}.${'z'.repeat(63)}.com`).should.be.true()

            validate.isFQDN('x'.repeat(64) + '.com').should.be.false()
        })

        it('Only allows FQDNs less than 253 characters long', async function () {
            validate.isFQDN('x.'.repeat(125) + 'com').should.be.true()

            validate.isFQDN('x.'.repeat(126) + 'com').should.be.false()
        })

        it('Requires FQDNs to be at least 4 characters long excluding trailing .', async function () {
            validate.isFQDN('t.c').should.be.false()
            validate.isFQDN('t.c.').should.be.false()

            validate.isFQDN('t.co').should.be.true()
        })

        it('Allows a single trailing full stop', async function () {
            validate.isFQDN('example.com.').should.be.true()

            validate.isFQDN('example.com..').should.be.false()
        })
    })
})
