const fastify = require('fastify')
const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const permissions = FF_UTIL.require('forge/routes/auth/permissions.js')

describe('Permissions API', async () => {
    let app

    // These constants provide mock 'request' objects for the different combinations
    // of user/session/token/teamMembership that we handle.
    const ADMIN_SESSION_NO_TEAM = {
        session: { User: { id: 'u123', admin: true } }
    }
    const USER_SESSION_NO_TEAM = {
        session: { User: { id: 'u123' } }
    }
    const USER_SESSION_TEAM_OWNER = {
        session: { User: { id: 'u123' } },
        teamMembership: { role: Roles.Owner }
    }
    const USER_SESSION_TEAM_MEMBER = {
        session: { User: { id: 'u123' } },
        teamMembership: { role: Roles.Member }
    }
    const ADMIN_TOKEN_NO_SCOPE_NO_TEAM = {
        session: { User: { id: 'u123', admin: true }, ownerType: 'user', scope: [] }
    }
    const ADMIN_TOKEN_SCOPE_NO_TEAM = {
        session: { User: { id: 'u123', admin: true }, ownerType: 'user', scope: ['project-type:create'] }
    }
    const USER_TOKEN_NO_SCOPE_NO_TEAM = {
        session: { User: { id: 'u123' }, ownerType: 'user', scope: [] }
    }
    const USER_TOKEN_NO_SCOPE_TEAM_OWNER = {
        session: { User: { id: 'u123' }, ownerType: 'user', scope: [] },
        teamMembership: { role: Roles.Owner }
    }
    const USER_TOKEN_SCOPE_TEAM_MEMBER = {
        session: { User: { id: 'u123' }, ownerType: 'user', scope: ['team:read'] },
        teamMembership: { role: Roles.Member }
    }
    const USER_TOKEN_NO_SCOPE_TEAM_MEMBER = {
        session: { User: { id: 'u123' }, ownerType: 'user', scope: [] },
        teamMembership: { role: Roles.Member }
    }
    const PROJECT_TOKEN_NO_SCOPE = {
        session: { ownerType: 'project', scope: [] }
    }

    before(async () => {
        app = fastify({})
        app.register(permissions)
        app.decorate('settings', {
            get: scope => true
        })
        await app.ready()
    })

    async function sendRequest (scope, request, options = {}) {
        const func = app.needsPermission(scope)
        const response = {}
        const reply = {
            code: code => { response.code = code; return reply },
            send: data => { response.data = data; return reply }
        }
        try {
            await func({ ...request, ...options }, reply)
            return
        } catch (err) {
            return response
        }
    }

    function verifyResponse (isAllowed, response) {
        if (isAllowed) {
            should.not.exist(response)
        } else {
            should.exist(response)
            response.should.have.property('code', 403)
            response.should.have.property('data')
            response.data.should.have.property('code', 'unauthorized')
            response.data.should.have.property('error', 'unauthorized')
        }
    }
    function expectPass (response) {
        verifyResponse(true, response)
    }
    function expectFail (response) {
        verifyResponse(false, response)
    }

    describe('needsPermission', () => {
        it('rejects invalid scope', () => {
            should(() => {
                app.needsPermission('test:scope')
            }).throw()
        })
        describe('sessions', () => {
            it('Allows admin to access admin-only route', async () => {
                expectPass(await sendRequest('project-type:create', ADMIN_SESSION_NO_TEAM))
            })

            it('Prevents non-admin accessing admin-only route', async () => {
                expectFail(await sendRequest('project-type:create', USER_SESSION_TEAM_OWNER))
            })

            it('Prevents non-team member accessing team route', async () => {
                expectFail(await sendRequest('team:read', USER_SESSION_NO_TEAM))
            })

            it('Allows team member to access team route', async () => {
                expectPass(await sendRequest('team:read', USER_SESSION_TEAM_MEMBER))
            })

            it('Prevents team member access team route that requires higher role', async () => {
                expectFail(await sendRequest('team:edit', USER_SESSION_TEAM_MEMBER))
            })
            it('Allows user to operate on themselves', async () => {
                expectPass(await sendRequest('user:read', USER_SESSION_TEAM_OWNER, { user: { id: 'u123' } }))
            })
            it('Prevents user operating on someone else', async () => {
                expectFail(await sendRequest('user:read', USER_SESSION_TEAM_OWNER, { user: { id: 'u234' } }))
            })
            it('Allows user to operate on themselves without sufficient role', async () => {
                expectPass(await sendRequest('team:user:remove', USER_SESSION_TEAM_MEMBER, { user: { id: 'u123' } }))
            })
            it('Allows admin to operate on any user', async () => {
                expectPass(await sendRequest('user:read', ADMIN_SESSION_NO_TEAM, { user: { id: '234' } }))
            })
        })
        describe('tokens', () => {
            it('Allows admin to access admin-only route if token has scope', async () => {
                expectPass(await sendRequest('project-type:create', ADMIN_TOKEN_SCOPE_NO_TEAM))
            })
            it('Prevents admin to access admin-only route if token missing scope', async () => {
                // No scopes at all
                expectFail(await sendRequest('project-type:create', ADMIN_TOKEN_NO_SCOPE_NO_TEAM))
                // Not the scope we're looking for
                expectFail(await sendRequest('project-type:delete', ADMIN_TOKEN_SCOPE_NO_TEAM))
            })
            it('Prevents admin accessing non-admin route if token has incorrect scope', async () => {
                expectFail(await sendRequest('project:read', ADMIN_TOKEN_SCOPE_NO_TEAM))
            })
            it('Prevents non-admin accessing admin-only route', async () => {
                expectFail(await sendRequest('project-type:create', USER_TOKEN_NO_SCOPE_TEAM_OWNER))
            })

            it('Prevents non-team member accessing team route', async () => {
                expectFail(await sendRequest('team:read', USER_TOKEN_NO_SCOPE_NO_TEAM))
            })

            it('Prevents team member accessing team route if token missing scope', async () => {
                expectFail(await sendRequest('team:read', USER_TOKEN_NO_SCOPE_TEAM_MEMBER))
            })

            it('Allows team member to access team route if token has scope', async () => {
                expectPass(await sendRequest('team:read', USER_TOKEN_SCOPE_TEAM_MEMBER))
            })

            describe('implicit scopes', () => {
                it('Allows a project token to access any of its implicit scopes', async () => {
                    expectPass(await sendRequest('project:flows:view', PROJECT_TOKEN_NO_SCOPE))
                })
                it('Prevents project token accessing any other scope', async () => {
                    expectFail(await sendRequest('team:delete', PROJECT_TOKEN_NO_SCOPE))
                })
            })
        })
    })
})
