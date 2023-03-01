const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const licensing = FF_UTIL.require('forge/licensing/loader.js')

describe('License Loader', function () {
    it('should load a valid license', async function () {
        // {
        //     iss: "FlowForge Inc.",
        //     exp: 2200-01-01,
        //     sub: "Acme Customer",
        //     tier: "teams"
        // }
        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsImV4cCI6NzI1ODExODQwMCwic3ViIjoiQWNtZSBDdXN0b21lciIsInRpZXIiOiJ0ZWFtcyIsImlhdCI6MTYyNzU4NzkxOX0.5B57eY_fP51mOqwQTf2fB6MmpLUwsZgEeMkiK_kFDqTh_0htFdUsIj6BKuDBOl3Xpm2g93kS7U3DwIrS_qx2yQ'
        const licenseDetails = await licensing.verifyLicense(TEST_LICENSE)
        licenseDetails.should.have.property('organisation', 'Acme Customer')
        licenseDetails.expired.should.false()
    })
    it('should load a newer license with id', async function () {
        // {
        //     "id": "6f8ff7db-d7a6-4275-8abf-6c9e1a9c133b",
        //     "iss": "FlowForge Inc.",
        //     "sub": "Acme Customer",
        //     "nbf": 946684800,
        //     "exp": 7258118400,
        //     "note": "Development-mode Only. Not for production",
        //     "users": 150,
        //     "teams": 50,
        //     "projects": 50,
        //     "devices": 50,
        //     "dev": true
        // }
        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZmOGZmN2RiLWQ3YTYtNDI3NS04YWJmLTZjOWUxYTljMTMzYiIsImlzcyI6IkZsb3dGb3JnZSBJbmMuIiwic3ViIjoiQWNtZSBDdXN0b21lciIsIm5iZiI6OTQ2Njg0ODAwLCJleHAiOjcyNTgxMTg0MDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NzcyMzg4ODR9.aacjGQmwj918lQWvjZl3CjCPi6IilvsTEiDkU29Dc9toZS9Yu4FQtAzE9rnuwh81yWHn9yaPA1DLaAWLp1KUBw'
        const licenseDetails = await licensing.verifyLicense(TEST_LICENSE)
        licenseDetails.should.have.property('organisation', 'Acme Customer')
        licenseDetails.should.have.property('id', '6f8ff7db-d7a6-4275-8abf-6c9e1a9c133b')
        licenseDetails.expired.should.false()
    })
    it('should prevent modification of the license', async function () {
        'use strict'
        // {
        //     iss: "FlowForge Inc.",
        //     exp: 2200-01-01,
        //     sub: "Acme Customer",
        //     tier: "teams"
        // }
        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsImV4cCI6NzI1ODExODQwMCwic3ViIjoiQWNtZSBDdXN0b21lciIsInRpZXIiOiJ0ZWFtcyIsImlhdCI6MTYyNzU4NzkxOX0.5B57eY_fP51mOqwQTf2fB6MmpLUwsZgEeMkiK_kFDqTh_0htFdUsIj6BKuDBOl3Xpm2g93kS7U3DwIrS_qx2yQ'
        const licenseDetails = await licensing.verifyLicense(TEST_LICENSE);
        (function () { licenseDetails.sub = 'please throw' }).should.throw()
    })
    it('should load an expired license', async function () {
        // {
        //     iss: "FlowForge Inc.",
        //     exp: 2001-01-01,
        //     sub: "Acme Customer",
        //     tier: "teams"
        // }
        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsImV4cCI6OTc4MzA3MjAwLCJzdWIiOiJBY21lIEN1c3RvbWVyIiwidGllciI6InRlYW1zIiwiaWF0IjoxNjI3NTg4MDA5fQ.qHm0I4RWDz_JewabonqJ_i1RJY4rTE1B6BN1A-Sit5CPvqEXg-01ljeHQJIQcNqMavp9wxZQViLei2yIwAP10A'
        const licenseDetails = await licensing.verifyLicense(TEST_LICENSE)
        should(licenseDetails).be.an.Object()
        licenseDetails.should.have.property('expired', true)
        licenseDetails.should.have.property('valid', false)
    })
    it('should reject an invalid issuer', async function () {
        // {
        //     iss: "Someone Else",
        //     exp: 2200-01-01,
        //     sub: "Acme Customer",
        //     tier: "teams"
        // }
        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJTb21lb25lIEVsc2UiLCJleHAiOjcyNTgxMTg0MDAsInN1YiI6IkFjbWUgQ3VzdG9tZXIiLCJ0aWVyIjoidGVhbXMiLCJpYXQiOjE2Mjc1ODg0NjJ9.uTMaTnrcWJgEOh2b_pDMTpMJmG3AajKoNczWolrM0eZhO1gglJWOv2FFUrLgR3l7MFw6y2QouD_JRVEwuoJARQ'
        await licensing.verifyLicense(TEST_LICENSE).should.be.rejected()
    })
    it('should reject an invalid signature', async function () {
        // License generated with a different priv key
        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJTb21lb25lIEVsc2UiLCJleHAiOjcyNTgxMTg0MDAsInN1YiI6IkFjbWUgQ3VzdG9tZXIiLCJ0aWVyIjoidGVhbXMiLCJpYXQiOjE2Mjc1ODg3NjV9.SJP4dMqJdl7xb1ZKXn9SYdaJSDGOcOCIHk-rDdqr0RqC-vBTh-mFESFGNXyt6gEXiOFrZdevo624irU1Ntr-Hg'
        await licensing.verifyLicense(TEST_LICENSE).should.be.rejected()
    })
})
