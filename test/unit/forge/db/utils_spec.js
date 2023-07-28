const should = require('should')
const utils = require('../../../../forge/db/utils.js')

describe.only('db utils', () => {
    it('should export an object', () => {
        should(utils).be.Object()
    })

    describe('getCanonicalEmail', () => {
        it('should be a function', () => {
            utils.should.have.property('getCanonicalEmail').which.is.Function()
        })
        it('should return a string', () => {
            const result = utils.getCanonicalEmail('alice@wonderland.com')
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
            const result = utils.getCanonicalEmail('Alice@Wonderland.COM')
            should(result).be.String().and.equal('alice@wonderland.com')
        })
        it('should trim an email', () => {
            const result = utils.getCanonicalEmail(' alice@wonderland.com ')
            should(result).be.String().and.equal('alice@wonderland.com')
        })
        it('should remove dots from gmail addresses', () => {
            const result = utils.getCanonicalEmail('alice.pleasance.liddel@gmail.com')
            should(result).be.String().and.equal('alicepleasanceliddel@gmail.com')
        })
        it('should not remove dots from a NON gmail address', () => {
            const result = utils.getCanonicalEmail('alice.pleasance.liddel@outlook.com')
            should(result).be.String().and.equal('alice.pleasance.liddel@outlook.com')
        })
    })
})