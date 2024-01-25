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

    describe('randomStrings', () => {
        it('should be a function', () => {
            utils.should.have.property('randomStrings').which.is.Function()
        })
        it('should return an array of 3 strings, any length', () => {
            const result = utils.randomStrings(3)
            should(result).be.Array().and.have.length(3)
            result.should.matchEach(s => should(s).be.String())
        })
        it('should return an array of 5 strings, min length 8', () => {
            const result = utils.randomStrings(5, 8)
            should(result).be.Array().and.have.length(5)
            result.should.matchEach(s => s.length.should.be.greaterThanOrEqual(8))
        })
        it('should return an array of strings, min length 3, max length 5', () => {
            const result = utils.randomStrings(30, 3, 5)
            should(result).be.Array().and.have.length(30)
            result.should.matchEach(s => s.length.should.be.oneOf([3, 4, 5]))
        })
    })

    describe('randomPhrase', () => {
        it('should be a function', () => {
            utils.should.have.property('randomPhrase').which.is.Function()
        })
        it('should return a string', () => {
            const result = utils.randomPhrase()
            should(result).be.String()
        })
        it('should return a string of 8 or more characters by default', () => {
            const result = []
            for (let i = 0; i < 100; i++) {
                result.push(utils.randomPhrase())
            }
            result.should.matchEach(s => s.length.should.be.greaterThanOrEqual(8))
        })
        it('should return a string with 3 words by default', () => {
            const result = utils.randomPhrase()
            should(result.split('-')).be.Array().and.have.length(3)
        })
        it('should return a string with 5 words', () => {
            const result = utils.randomPhrase(5)
            should(result.split('-')).be.Array().and.have.length(5)
        })
        it('should return a string with 3 words, min length 8', () => {
            const result = utils.randomPhrase(3, 8)
            should(result.split('-')).be.Array().and.have.length(3)
            result.split('-').should.matchEach(s => s.length.should.be.greaterThanOrEqual(8))
        })
        it('should return a string with 3 words, min length 8, max length 10', () => {
            const result = utils.randomPhrase(3, 8, 10)
            should(result.split('-')).be.Array().and.have.length(3)
            result.split('-').should.matchEach(s => s.length.should.be.oneOf([8, 9, 10]))
        })
        it('should return a string with 3 words, min length 8, max length 10, using _ as separator', () => {
            const result = utils.randomPhrase(3, 8, 10, '_')
            should(result.split('_')).be.Array().and.have.length(3)
            result.split('_').should.matchEach(s => s.length.should.be.oneOf([8, 9, 10]))
        })
    })
})
