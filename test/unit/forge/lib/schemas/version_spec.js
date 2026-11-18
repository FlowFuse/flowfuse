const should = require('should')

const { isValidVersion, checkNewVersion, highestVersion } = require('../../../../../forge/lib/schemas/version')

describe('Schema version rules', function () {
    describe('isValidVersion', function () {
        it('accepts plain major.minor.patch versions', function () {
            isValidVersion('0.0.0').should.be.true()
            isValidVersion('1.2.3').should.be.true()
            isValidVersion('10.20.30').should.be.true()
        })

        it('rejects versions that semver would normalise', function () {
            isValidVersion('v1.2.0').should.be.false()
            isValidVersion('=1.2.0').should.be.false()
            isValidVersion(' 1.2.0').should.be.false()
            isValidVersion('1.2.0 ').should.be.false()
            isValidVersion('1.2.0+build').should.be.false()
        })

        it('rejects prerelease versions', function () {
            isValidVersion('1.2.0-rc.1').should.be.false()
            isValidVersion('1.2.0-alpha').should.be.false()
        })

        it('rejects incomplete versions and leading zeros', function () {
            isValidVersion('1').should.be.false()
            isValidVersion('1.2').should.be.false()
            isValidVersion('1.2.3.4').should.be.false()
            isValidVersion('01.2.0').should.be.false()
            isValidVersion('1.02.0').should.be.false()
        })

        it('rejects anything that is not a string', function () {
            isValidVersion(undefined).should.be.false()
            isValidVersion(null).should.be.false()
            isValidVersion(1).should.be.false()
            isValidVersion({}).should.be.false()
            isValidVersion('').should.be.false()
        })
    })

    describe('checkNewVersion', function () {
        it('accepts any valid version when nothing exists yet', function () {
            should(checkNewVersion('0.1.0', [])).be.null()
            should(checkNewVersion('3.0.0', [])).be.null()
        })

        it('accepts a version higher than every existing version', function () {
            should(checkNewVersion('1.3.0', ['1.0.0', '1.2.0'])).be.null()
            should(checkNewVersion('2.0.0', ['1.0.0', '1.2.0'])).be.null()
        })

        it('rejects an invalid version', function () {
            checkNewVersion('v2.0.0', ['1.0.0']).should.eql({ code: 'invalid_version' })
            checkNewVersion('1.2', []).should.eql({ code: 'invalid_version' })
        })

        it('rejects an existing version, including a deprecated one', function () {
            // the caller passes published and deprecated versions alike
            checkNewVersion('1.0.0', ['1.0.0', '1.1.0']).should.eql({ code: 'version_exists' })
        })

        it('rejects a version lower than the highest existing version', function () {
            checkNewVersion('1.1.0', ['1.0.0', '1.2.0']).should.eql({ code: 'version_not_higher', highest: '1.2.0' })
        })

        it('compares versions numerically', function () {
            should(checkNewVersion('1.10.0', ['1.9.0'])).be.null()
            checkNewVersion('1.9.0', ['1.10.0']).should.eql({ code: 'version_not_higher', highest: '1.10.0' })
        })
    })

    describe('highestVersion', function () {
        it('returns the highest version', function () {
            highestVersion(['1.9.0', '2.0.0', '1.10.0']).should.equal('2.0.0')
            highestVersion(['1.9.0', '1.10.0']).should.equal('1.10.0')
        })

        it('returns null when there are no versions', function () {
            should(highestVersion([])).be.null()
        })

        it('does not reorder the array passed in', function () {
            const versions = ['1.0.0', '2.0.0']
            highestVersion(versions)
            versions.should.eql(['1.0.0', '2.0.0'])
        })
    })
})
