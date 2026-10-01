const should = require('should') // eslint-disable-line

const {
    normalise,
    equals,
    fromReadOnly,
    fromGrant,
    deriveReadOnly,
    effectiveReadOnly,
    classOf,
    resolve,
    anyTeamAllows
} = require('../../../../forge/lib/mcpToolPermissions')

describe('mcpToolPermissions', function () {
    describe('normalise', function () {
        it('stacks destructive into write into read', function () {
            const result = normalise({ platform: { destructive: true } })
            result.platform.should.eql({ read: true, write: true, destructive: true })
        })

        it('stacks write into read without granting destructive', function () {
            const result = normalise({ platform: { write: true } })
            result.platform.should.eql({ read: true, write: true, destructive: false })
        })

        it('leaves a read-only category untouched', function () {
            const result = normalise({ platform: { read: true } })
            result.platform.should.eql({ read: true, write: false, destructive: false })
        })

        it('defaults a missing group to all-false', function () {
            const result = normalise({ platform: { read: true } })
            result.flow_building.should.eql({ read: false, write: false, destructive: false })
        })

        it('defaults a missing/null input to all-false in both groups', function () {
            normalise(null).should.eql({
                platform: { read: false, write: false, destructive: false },
                flow_building: { read: false, write: false, destructive: false }
            })
        })
    })

    describe('equals', function () {
        it('is true for structurally equal permissions', function () {
            const a = normalise({ platform: { write: true } })
            const b = normalise({ platform: { write: true } })
            equals(a, b).should.be.true()
        })

        it('is false when a category differs', function () {
            const a = normalise({ platform: { write: true } })
            const b = normalise({ platform: { read: true } })
            equals(a, b).should.be.false()
        })
    })

    describe('fromReadOnly', function () {
        it('grants read and write on both groups with no team overrides when not read-only', function () {
            fromReadOnly(false).should.eql({
                default: {
                    platform: { read: true, write: true, destructive: false },
                    flow_building: { read: true, write: true, destructive: false }
                },
                teams: {}
            })
        })

        it('grants read-only on both groups with no team overrides when read-only', function () {
            fromReadOnly(true).should.eql({
                default: {
                    platform: { read: true, write: false, destructive: false },
                    flow_building: { read: true, write: false, destructive: false }
                },
                teams: {}
            })
        })
    })

    describe('fromGrant', function () {
        it('keys team rows by their encoded team id', function () {
            const grant = { permissions: { platform: { read: true } } }
            const rows = [{ TeamId: 3, permissions: { platform: { write: true } } }]
            fromGrant(grant, rows, id => `team-${id}`).should.eql({
                default: { platform: { read: true } },
                teams: { 'team-3': { platform: { write: true } } }
            })
        })

        it('returns no teams when there are no rows', function () {
            fromGrant({ permissions: {} }, undefined, id => id).teams.should.eql({})
        })
    })

    describe('classOf', function () {
        it('classifies a readOnlyHint tool as read', function () {
            classOf({ readOnlyHint: true, destructiveHint: false }).should.equal('read')
        })

        it('classifies a destructiveHint tool as destructive', function () {
            classOf({ readOnlyHint: false, destructiveHint: true }).should.equal('destructive')
        })

        it('classifies anything else as write', function () {
            classOf({ readOnlyHint: false, destructiveHint: false }).should.equal('write')
            classOf({}).should.equal('write')
            classOf(undefined).should.equal('write')
        })

        it('prefers readOnlyHint over destructiveHint', function () {
            classOf({ readOnlyHint: true, destructiveHint: true }).should.equal('read')
        })
    })

    describe('resolve', function () {
        const tokenPermissions = {
            default: normalise({ platform: { write: true }, flow_building: { read: true } }),
            teams: {
                'team-a': normalise({ platform: { destructive: true } })
            }
        }

        it('uses the team override when one exists', function () {
            resolve(tokenPermissions, 'team-a', 'platform', 'destructive').should.be.true()
        })

        it('falls back to the default when no override exists for the team', function () {
            resolve(tokenPermissions, 'team-b', 'platform', 'write').should.be.true()
            resolve(tokenPermissions, 'team-b', 'platform', 'destructive').should.be.false()
        })

        it('falls back to the default when no team is given', function () {
            resolve(tokenPermissions, null, 'flow_building', 'read').should.be.true()
        })

        it('denies everything for a null tokenPermissions', function () {
            resolve(null, 'team-a', 'platform', 'read').should.be.false()
        })
    })

    describe('anyTeamAllows', function () {
        it('is true when the default allows the category', function () {
            const tokenPermissions = { default: normalise({ platform: { write: true } }), teams: {} }
            anyTeamAllows(tokenPermissions, 'platform', 'write').should.be.true()
        })

        it('is true when only a team override allows the category', function () {
            const tokenPermissions = {
                default: normalise({}),
                teams: { 'team-a': normalise({ platform: { destructive: true } }) }
            }
            anyTeamAllows(tokenPermissions, 'platform', 'destructive').should.be.true()
        })

        it('is false when neither the default nor any override allows the category', function () {
            const tokenPermissions = {
                default: normalise({ platform: { read: true } }),
                teams: { 'team-a': normalise({ platform: { read: true } }) }
            }
            anyTeamAllows(tokenPermissions, 'platform', 'write').should.be.false()
        })

        it('is false for a null tokenPermissions', function () {
            anyTeamAllows(null, 'platform', 'read').should.be.false()
        })
    })

    describe('effectiveReadOnly', function () {
        const encode = (id) => 'team' + id
        const grantWith = (permissions, teamRows = []) => ({ permissions, MCPGrantTeamPermissions: teamRows })

        it('uses the stored flag for a token without a grant', function () {
            effectiveReadOnly({ readOnly: true }, encode).should.be.true()
            effectiveReadOnly({ readOnly: false }, encode).should.be.false()
            effectiveReadOnly({}, encode).should.be.false()
        })

        it('follows the grant rather than the stored flag', function () {
            const readOnlyGrant = grantWith(fromReadOnly(true).default)
            effectiveReadOnly({ readOnly: false, MCPGrant: readOnlyGrant }, encode).should.be.true()
        })

        it('is false when only a team row allows write', function () {
            const writable = fromReadOnly(false).default
            const grant = grantWith(fromReadOnly(true).default, [{ TeamId: 2, permissions: writable }])
            effectiveReadOnly({ readOnly: true, MCPGrant: grant }, encode).should.be.false()
        })

        it('turns true again once that team row is gone', function () {
            const grant = grantWith(fromReadOnly(true).default, [])
            effectiveReadOnly({ readOnly: false, MCPGrant: grant }, encode).should.be.true()
        })
    })

    describe('deriveReadOnly', function () {
        it('is false when the default allows write in any group', function () {
            const tokenPermissions = { default: normalise({ flow_building: { write: true } }), teams: {} }
            deriveReadOnly(tokenPermissions).should.be.false()
        })

        it('is false when only a team override allows write', function () {
            const tokenPermissions = {
                default: normalise({}),
                teams: { 'team-a': normalise({ platform: { write: true } }) }
            }
            deriveReadOnly(tokenPermissions).should.be.false()
        })

        it('is true when nothing allows write in any group', function () {
            const tokenPermissions = {
                default: normalise({ platform: { read: true }, flow_building: { read: true } }),
                teams: { 'team-a': normalise({ platform: { read: true } }) }
            }
            deriveReadOnly(tokenPermissions).should.be.true()
        })
    })
})
