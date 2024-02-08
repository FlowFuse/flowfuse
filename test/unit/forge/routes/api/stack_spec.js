const { Op } = require('sequelize')
const should = require('should') // eslint-disable-line
const setup = require('../setup')
// const FF_UTIL = require('flowforge-test-utils')
// const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Stack API', function () {
    let app
    const TestObjects = {}
    let stackInstanceCount = 0
    const generateStackName = () => `stack-${stackInstanceCount++}`

    before(async function () {
        app = await setup()

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.stack1 = await app.db.models.ProjectStack.byId(app.stack.id)
        TestObjects.tokens = {}
        TestObjects.projectType1 = app.projectType
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
    })
    after(async function () {
        await app.close()
    })

    async function createStack (stackName) {
        return (await app.inject({
            method: 'POST',
            url: '/api/v1/stacks',
            cookies: { sid: TestObjects.tokens.alice },
            payload: {
                name: stackName,
                active: true,
                projectType: TestObjects.projectType1.hashid,
                properties: {
                    foo: 'bar'
                }
            }
        })).json()
    }

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    describe('Create stacks', async function () {
        // POST /api/v1/stacks
        // - Must be admin or team owner/member
        it('Create a simple stack', async function () {
            const stackName = generateStackName()
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: stackName,
                    active: true,
                    projectType: TestObjects.projectType1.hashid,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', stackName)
            result.should.have.property('active', true)
            result.should.have.property('projectType', TestObjects.projectType1.hashid)
            result.should.have.property('instanceCount', 0)
            result.should.have.property('properties')
            result.properties.should.have.property('foo', 'bar')
            result.should.not.have.property('replacedBy')
        })
        it('Ensure stack name is unique', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'stack1' // stack1 created in setup
                }
            })
            response.statusCode.should.equal(400)
            response.json().should.have.property('error')
        })
        it('Creates a stack to replace an existing one', async function () {
            const stackName = generateStackName()
            const originalStack = await createStack(stackName)

            const newStackName = generateStackName()
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: newStackName,
                    active: true,
                    projectType: TestObjects.projectType1.hashid,
                    replace: originalStack.id,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()

            const stack1Request = await app.inject({
                method: 'GET',
                url: `/api/v1/stacks/${originalStack.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const stack1 = stack1Request.json()
            stack1.should.have.property('replacedBy', result.id)
        })
        it('Fails to create a stack when replacing an unknown stack', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'stack2',
                    active: true,
                    replace: 'invalid-stack-hash',
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('error')
        })

        it('Fails to create a stack when replacing an already replaced stack', async function () {
            const originalStack = await createStack(generateStackName())

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'stack2',
                    active: true,
                    projectType: TestObjects.projectType1.hashid,
                    replace: originalStack.id,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            response.statusCode.should.equal(200)

            // Try to replace originalStack again
            const response2 = await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'stack3',
                    active: true,
                    projectType: TestObjects.projectType1.hashid,
                    replace: originalStack.id,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            response2.statusCode.should.equal(400)
            const result = response2.json()
            result.should.have.property('error')
        })
        it('Updates previously replaced stacks to point to latest', async function () {
            const stackName = generateStackName()
            const originalStack = await createStack(stackName)

            const newStackName = generateStackName()

            // originalStack gets replaced by newStack
            const response2 = await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: newStackName,
                    active: true,
                    projectType: TestObjects.projectType1.hashid,
                    replace: originalStack.id,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            const stack2 = response2.json()

            const initialStack1Request = await app.inject({
                method: 'GET',
                url: `/api/v1/stacks/${originalStack.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            initialStack1Request.json().should.have.property('replacedBy', stack2.id)

            const newStackName2 = generateStackName()
            const response3 = await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: newStackName2,
                    active: true,
                    projectType: TestObjects.projectType1.hashid,
                    replace: stack2.id,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            const stack3 = response3.json()

            const stack1Request = await app.inject({
                method: 'GET',
                url: `/api/v1/stacks/${originalStack.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            stack1Request.json().should.have.property('replacedBy', stack3.id)

            const stack2Request = await app.inject({
                method: 'GET',
                url: `/api/v1/stacks/${stack2.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            stack2Request.json().should.have.property('replacedBy', stack3.id)
        })
    })

    describe('Get stack info', async function () {
        it('Includes instanceCount for admin user', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/stacks/${TestObjects.stack1.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'stack1')
            result.should.have.property('active', true)
            result.should.have.property('instanceCount', 1)
        })
        it('Excludes instanceCount for non-admin user', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/stacks/${TestObjects.stack1.hashid}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'stack1')
            result.should.have.property('active', true)
            result.should.not.have.property('instanceCount')
        })
    })

    describe('Update stack', async function () {
        it('Prevents stack updates for in-use stacks', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/stacks/${TestObjects.stack1.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'changed-name' // stack1 created in setup
                }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('error')
        })
        it('Prevents non-admin from editing the stack', async function () {
            // Bob (non-admin)
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/stacks/${TestObjects.stack1.hashid}`,
                cookies: { sid: TestObjects.tokens.bob },
                payload: {
                    active: false // stack1 created in setup
                }
            })
            response.statusCode.should.equal(403)
        })
        it('Allows active flag to be changed for in-use stacks', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/stacks/${TestObjects.stack1.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    active: false // stack1 created in setup
                }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'stack1')
            result.should.have.property('active', false)
            result.should.have.property('instanceCount', 1)

            // Restore the flag for later tests
            await app.inject({
                method: 'PUT',
                url: `/api/v1/stacks/${TestObjects.stack1.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    active: true // stack1 created in setup
                }
            })
        })
        it('Cannot change projectType for stack that already has one', async function () {
            const projectType2 = await app.db.models.ProjectType.create({
                name: 'projectType2',
                description: 'second project type',
                active: true,
                properties: { foo: 'bar' },
                order: 2
            })

            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/stacks/${TestObjects.stack1.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    projectType: projectType2.hashid
                }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('error', 'Cannot change stack project type')
        })
        it('Can set projectType for legacy stack that does not have one', async function () {
            // Need to create a legacy stack
            const legacyStack = await app.db.models.ProjectStack.create({
                name: 'legacyStack',
                active: true,
                properties: {}
            })
            const legacyProject = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })
            await TestObjects.ATeam.addProject(legacyProject)
            await legacyProject.setProjectStack(legacyStack)

            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/stacks/${legacyStack.hashid}`,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    projectType: TestObjects.projectType1.hashid
                }
            })
            response.statusCode.should.equal(200)
            const getResponse = await app.inject({
                method: 'GET',
                url: `/api/v1/stacks/${legacyStack.hashid}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = getResponse.json()
            result.should.have.property('id')
            result.should.have.property('name', 'legacyStack')
            result.should.have.property('active', true)
            result.should.have.property('projectType', TestObjects.projectType1.hashid)

            const projectResponse = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${legacyProject.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const projectResult = projectResponse.json()
            projectResult.should.have.property('projectType')
            projectResult.projectType.should.have.property('id', TestObjects.projectType1.hashid)
            projectResult.projectType.should.have.property('name', TestObjects.projectType1.name)
        })
    })

    describe('Delete stack', async function () {
        let unusedStack
        beforeEach(async function () {
            const createResponse = await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: generateStackName(),
                    active: true,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            unusedStack = createResponse.json()
        })
        it('Allows admin to delete an unused stack', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/stacks/${unusedStack.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
        })

        it('Prevents non-admin from deleting an unused stack', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/stacks/${unusedStack.id}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })

        it('Prevents admin from deleting a used stack', async function () {
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/stacks/${TestObjects.stack1.hashid}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })

        it('Prevents admin from deleting a stack that is marked as replacing another', async function () {
            const response2 = await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'stack2',
                    active: true,
                    replace: TestObjects.stack1.hashid,
                    properties: {
                        foo: 'bar'
                    }
                }
            })
            const stack2 = response2.json()

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/stacks/${stack2.id}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
    })

    describe('List stacks', async function () {
        let stack3
        beforeEach(async function () {
            await app.db.models.ProjectStack.destroy({ where: { name: { [Op.not]: 'stack1' } } })
            await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'stack2',
                    active: false,
                    properties: {}
                }
            })
            stack3 = (await app.inject({
                method: 'POST',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    name: 'stack3',
                    active: true,
                    properties: {}
                }
            })).json()
        })

        it('only lists active stacks by default', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/stacks',
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.should.have.property('stacks')
            result.stacks.should.have.length(2)
            result.stacks[0].should.have.property('name', 'stack1')
            result.stacks[1].should.have.property('name', 'stack3')
        })

        it('lists all stacks if requested', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/stacks',
                query: { filter: 'all' },
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.should.have.property('stacks')
            result.stacks.should.have.length(3)
            result.stacks[0].should.have.property('name', 'stack1')
            result.stacks[1].should.have.property('name', 'stack2')
            result.stacks[2].should.have.property('name', 'stack3')
        })

        it('lists only active stacks', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/stacks',
                query: { filter: 'active' },
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.should.have.property('stacks')
            result.stacks.should.have.length(2)
            result.stacks[0].should.have.property('name', 'stack1')
            result.stacks[1].should.have.property('name', 'stack3')
        })

        it('lists only inactive stacks', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/stacks',
                query: { filter: 'inactive' },
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.should.have.property('stacks')
            result.stacks.should.have.length(1)
            result.stacks[0].should.have.property('name', 'stack2')
        })

        it('lists all stacks that have been replaced by a given stack', async function () {
            await app.db.models.ProjectStack.update({
                replacedBy: app.db.models.ProjectStack.decodeHashid(stack3.id)
            }, {
                where: {
                    [Op.or]: [{ name: 'stack1' }, { name: 'stack2' }]
                }
            })

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/stacks',
                query: { filter: `replacedBy:${stack3.id}` },
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.should.have.property('stacks')
            result.stacks.should.have.length(2)
            result.stacks[0].should.have.property('name', 'stack1')
            result.stacks[1].should.have.property('name', 'stack2')
        })

        it('lists all stacks for a given ProjectType', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/stacks',
                query: { projectType: TestObjects.projectType1.hashid },
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.stacks.should.have.length(1)
            result.stacks[0].should.have.property('name', 'stack1')
        })
        it('lists no stacks for an invalid ProjectType', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/stacks',
                query: { projectType: 'invalid' },
                cookies: { sid: TestObjects.tokens.bob }
            })
            const result = response.json()
            result.stacks.should.have.length(0)
        })
    })
})
