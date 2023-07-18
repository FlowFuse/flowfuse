const should = require('should') // eslint-disable-line

const snapshots = require('../../../../forge/services/snapshots')

describe('Snapshots Service', function () {
    describe('createSnapshot', function () {
        it('Creates a snapshot of the passed instance')
        it('Sets the snapshot as the target if setAsTarget is true')
    })

    describe('copySnapshot', function () {
        it('Creates a copy of the passed snapshot')
        it('Imports the snapshot if importSnapshot is true')
        it('Imports the snapshot copying across the environment variables')
        it('Sets the snapshot as the target if setAsTarget is true')
    })
})
