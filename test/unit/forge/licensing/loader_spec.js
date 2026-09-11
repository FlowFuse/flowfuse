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
    it('should load enterprise tier license', async function () {
        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJmZjAwMjJiLTAwOGMtNDI3OS1hNWU5LTEwOTI2YTNhNWNjMCIsImlzcyI6IkZsb3dGb3JnZSBJbmMuIiwic3ViIjoiRmxvd0ZvcmdlIEluYy4iLCJuYmYiOjE2OTQ2NDk2MDAsImV4cCI6MzI1MDM2ODAwMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTY5NDcwMTM3Nn0.3Gtyr0axCR2LcBUFAJgDwfIjhLEBbd91rHiGpePHl_oBab9Y6f3osPK6xBtR5ZnRwuSg6XuTp6xc7bQtdONKmA'
        const licenseDetails = await licensing.verifyLicense(TEST_LICENSE)
        licenseDetails.should.have.property('tier', 'enterprise')
    })
    it('should load teams tier license', async function () {
        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQyOWE5ZjM1LTA3ZmMtNDlmYy1iNGY5LTA3MjY0ZGQxOTE2MCIsImlzcyI6IkZsb3dGb3JnZSBJbmMuIiwic3ViIjoiRmxvd0ZvcmdlIEluYy4iLCJuYmYiOjE2OTQ2NDk2MDAsImV4cCI6MzI1MDM2ODAwMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwidGllciI6InRlYW1zIiwiZGV2Ijp0cnVlLCJpYXQiOjE2OTQ3MDExNzh9.ENcnQ-_c-sBGmEAQjiLbt5rIBRVCFBeLj2uZYXrGRoJ3JY7XL5r12KCNAW12BiMkTVqvCVnsRIA3lyQz-yteKA'
        const licenseDetails = await licensing.verifyLicense(TEST_LICENSE)
        licenseDetails.should.have.property('tier', 'teams')
    })
    it('should load a license with licenseId rather than id', async function () {
        // {
        // "licenseId": "766f544a-6296-46ab-9115-c0fd469688e7",
        // "ver": "2024-03-04",
        // "iss": "FlowForge Inc.",
        // "sub": "Acme Customer",
        // "nbf": 1748476800,
        // "exp": 33336921600,
        // "note": "Development-mode Only. Not for production",
        // "users": 150,
        // "teams": 50,
        // "instances": 50,
        // "mqttClients": 10,
        // "tier": "enterprise",
        // "dev": true
        // }
        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJsaWNlbnNlSWQiOiI3NjZmNTQ0YS02Mjk2LTQ2YWItOTExNS1jMGZkNDY5Njg4ZTciLCJ2ZXIiOiIyMDI0LTAzLTA0IiwiaXNzIjoiRmxvd0ZvcmdlIEluYy4iLCJzdWIiOiJBY21lIEN1c3RvbWVyIiwibmJmIjoxNzQ4NDc2ODAwLCJleHAiOjMzMzM2OTIxNjAwLCJub3RlIjoiRGV2ZWxvcG1lbnQtbW9kZSBPbmx5LiBOb3QgZm9yIHByb2R1Y3Rpb24iLCJ1c2VycyI6MTUwLCJ0ZWFtcyI6NTAsImluc3RhbmNlcyI6NTAsIm1xdHRDbGllbnRzIjoxMCwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTc0ODUzMzM5OX0.o2K4a5cTSXmblLeZAKoL__cKfKfMk-fIWkscQw6YfRUns91mEPn3Sq7R_qvfYPKlbj5k2SQ65n9C5b6ErMHerw'
        const licenseDetails = await licensing.verifyLicense(TEST_LICENSE)
        licenseDetails.should.have.property('organisation', 'Acme Customer')
        licenseDetails.should.have.property('id', '766f544a-6296-46ab-9115-c0fd469688e7')
        licenseDetails.expired.should.false()
    })
    it('should load a hub license', async function () {
        // {
        //     "id": "829f3870-8a76-4899-bd8e-d03bc364a465",
        //     "ver": "2026-08-20",
        //     "iss": "FlowForge Inc.",
        //     "sub": "Acme Customer",
        //     "nbf": 1756080000,
        //     "exp": 32524070400,
        //     "users": 5,
        //     "teams": 5,
        //     "instances": 5,
        //     "mqttClients": 20,
        //     "tiers": [
        //         "hub"
        //     ],
        //     "dev": true
        // }
        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjgyOWYzODcwLThhNzYtNDg5OS1iZDhlLWQwM2JjMzY0YTQ2NSIsInZlciI6IjIwMjYtMDgtMjAiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkFjbWUgQ3VzdG9tZXIiLCJuYmYiOjE3NTYwODAwMDAsImV4cCI6MzI1MjQwNzA0MDAsInVzZXJzIjo1LCJ0ZWFtcyI6NSwiaW5zdGFuY2VzIjo1LCJtcXR0Q2xpZW50cyI6MjAsInRpZXJzIjpbImh1YiJdLCJkZXYiOnRydWUsImlhdCI6MTc4NzY1NTk5OH0.SC7Z-ipTkV-Cy3akWlLgfEIlnrkFFQECdjXWtUA0WpZ7wA6gCSPJ0Ndw_rZrt8ajA5jycBoTU2CQ9pzpIx1QCw'
        const licenseDetails = await licensing.verifyLicense(TEST_LICENSE)
        licenseDetails.should.have.property('organisation', 'Acme Customer')
        licenseDetails.should.have.property('id', '829f3870-8a76-4899-bd8e-d03bc364a465')
        licenseDetails.should.have.property('tiers', ['hub'])
        licenseDetails.expired.should.false()
    })
    it('should load a edge license', async function () {
        // {
        //     "id": "bca3e9bf-967d-4acb-8120-b49db37a054f",
        //     "ver": "2026-08-20",
        //     "iss": "FlowForge Inc.",
        //     "sub": "Acme Customer",
        //     "nbf": 1756080000,
        //     "exp": 32524070400,
        //     "users": 5,
        //     "teams": 5,
        //     "instances": 5,
        //     "mqttClients": 20,
        //     "tiers": [
        //         "edge"
        //     ],
        //     "dev": true
        // }

        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJjYTNlOWJmLTk2N2QtNGFjYi04MTIwLWI0OWRiMzdhMDU0ZiIsInZlciI6IjIwMjYtMDgtMjAiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkFjbWUgQ3VzdG9tZXIiLCJuYmYiOjE3NTYwODAwMDAsImV4cCI6MzI1MjQwNzA0MDAsInVzZXJzIjo1LCJ0ZWFtcyI6NSwiaW5zdGFuY2VzIjo1LCJtcXR0Q2xpZW50cyI6MjAsInRpZXJzIjpbImVkZ2UiXSwiZGV2Ijp0cnVlLCJpYXQiOjE3ODc2NTY0MDR9.sdwywyQqMvVL13zQTC_AZ2wXJ9DoH4Mp9E1dCOZNi0vJXnz1ezKzboMW0u-EXPXZYKFWcydKe9T2xvKcXD_52A'
        const licenseDetails = await licensing.verifyLicense(TEST_LICENSE)
        licenseDetails.should.have.property('organisation', 'Acme Customer')
        licenseDetails.should.have.property('id', 'bca3e9bf-967d-4acb-8120-b49db37a054f')
        licenseDetails.should.have.property('tiers', ['edge'])
        licenseDetails.expired.should.false()
    })
    it('should load a fleet license', async function () {
        // {
        //     "id": "ad7ce3f5-be52-4e2b-ac2b-e8e37eafe77c",
        //     "ver": "2026-08-20",
        //     "iss": "FlowForge Inc.",
        //     "sub": "Acme Customer",
        //     "nbf": 1756080000,
        //     "exp": 32524070400,
        //     "users": 5,
        //     "teams": 5,
        //     "instances": 5,
        //     "mqttClients": 20,
        //     "tiers": [
        //         "fleet"
        //     ],
        //     "dev": true
        // }

        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkN2NlM2Y1LWJlNTItNGUyYi1hYzJiLWU4ZTM3ZWFmZTc3YyIsInZlciI6IjIwMjYtMDgtMjAiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkFjbWUgQ3VzdG9tZXIiLCJuYmYiOjE3NTYwODAwMDAsImV4cCI6MzI1MjQwNzA0MDAsInVzZXJzIjo1LCJ0ZWFtcyI6NSwiaW5zdGFuY2VzIjo1LCJtcXR0Q2xpZW50cyI6MjAsInRpZXJzIjpbImZsZWV0Il0sImRldiI6dHJ1ZSwiaWF0IjoxNzg3NjU2NTIyfQ.TekXdhfFHRxiAqyQmAPSGBwiADXsfl7poYHa-zQDjdq4Uagjcx_Vo-OhSB6lOUjhP-iBj9qCXa9G_8j46ucbZA'
        const licenseDetails = await licensing.verifyLicense(TEST_LICENSE)
        licenseDetails.should.have.property('organisation', 'Acme Customer')
        licenseDetails.should.have.property('id', 'ad7ce3f5-be52-4e2b-ac2b-e8e37eafe77c')
        licenseDetails.should.have.property('tiers', ['fleet'])
        licenseDetails.expired.should.false()
    })
    it('should load a hub & fleet license', async function () {
        // {
        //     "id": "6cb321c3-b74c-490b-a41e-9479d45379a8",
        //     "ver": "2026-08-20",
        //     "iss": "FlowForge Inc.",
        //     "sub": "Acme Customer",
        //     "nbf": 1756080000,
        //     "exp": 32524070400,
        //     "users": 5,
        //     "teams": 5,
        //     "instances": 5,
        //     "mqttClients": 20,
        //     "tiers": [
        //         "hub",
        //         "fleet"
        //     ],
        //     "dev": true
        // }

        const TEST_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZjYjMyMWMzLWI3NGMtNDkwYi1hNDFlLTk0NzlkNDUzNzlhOCIsInZlciI6IjIwMjYtMDgtMjAiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkFjbWUgQ3VzdG9tZXIiLCJuYmYiOjE3NTYwODAwMDAsImV4cCI6MzI1MjQwNzA0MDAsInVzZXJzIjo1LCJ0ZWFtcyI6NSwiaW5zdGFuY2VzIjo1LCJtcXR0Q2xpZW50cyI6MjAsInRpZXJzIjpbImh1YiIsImZsZWV0Il0sImRldiI6dHJ1ZSwiaWF0IjoxNzg3NjU2NjEyfQ.YNhwvV3kkeavaiP8iGTTqshCHNa3WvVfJZnnx0WgfLkh2zVB1bw3aFMy4uH5BGBS3i6Jxb4sSb2JxlbyMNDJoQ'
        const licenseDetails = await licensing.verifyLicense(TEST_LICENSE)
        licenseDetails.should.have.property('organisation', 'Acme Customer')
        licenseDetails.should.have.property('id', '6cb321c3-b74c-490b-a41e-9479d45379a8')
        licenseDetails.should.have.property('tiers', ['hub', 'fleet'])
        licenseDetails.expired.should.false()
    })
})
