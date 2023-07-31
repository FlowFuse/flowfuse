const should = require('should')

const utils = require('../../../../forge/db/utils.js')

describe('db utils', () => {
    it('should export an object', () => {
        should(utils).be.Object()
    })

    describe('getCanonicalEmail', () => {
        it('should be a function', () => {
            utils.should.have.property('getCanonicalEmail').which.is.Function()
        })
        it('should return a string', () => {
            const result = utils.getCanonicalEmail('alice@wonderland.com.fake')
            should(result).be.String()
        })
        it('should return null if email is null', () => {
            const result = utils.getCanonicalEmail(null)
            should(result).be.Null()
        })
        it('should return null if email is empty', () => {
            const result = utils.getCanonicalEmail('')
            should(result).be.Null()
        })
        it('should return a lower case email', () => {
            const result = utils.getCanonicalEmail('Alice@Wonderland.COM.fake')
            should(result).be.String().and.equal('alice@wonderland.com.fake')
        })
        it('should trim an email', () => {
            const result = utils.getCanonicalEmail(' alice@wonderland.com.fake ')
            should(result).be.String().and.equal('alice@wonderland.com.fake')
        })
        it('should remove dots from gmail addresses by default', () => {
            const result = utils.getCanonicalEmail('alice.pleasance.liddel@gmail.com.fake')
            should(result).be.String().and.equal('alicepleasanceliddel@gmail.com.fake')
        })
        it('should not remove dots from NON gmail address by default', () => {
            const result = utils.getCanonicalEmail('alice.pleasance.liddel@outlook.com.fake')
            should(result).be.String().and.equal('alice.pleasance.liddel@outlook.com.fake')
        })
        it('should remove dots from other email domains if specified', () => {
            const result = utils.getCanonicalEmail('alice.pleasance.liddel@fakemail.com.fake', { removeDotsForDomains: ['nonmail.', 'duffmail.', 'fakemail.'] })
            should(result).be.String().and.equal('alicepleasanceliddel@fakemail.com.fake')
        })
    })
})
