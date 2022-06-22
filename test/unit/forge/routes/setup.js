const FF_UTIL = require('flowforge-test-utils')
const Forge = FF_UTIL.require('forge/forge.js')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')

module.exports = async function (settings = {}, config = {}) {
    config = {
        ...config,
        telemetry: { enabled: false },
        logging: {
            level: 'warn'
        },
        db: {
            type: 'sqlite',
            storage: ':memory:'
        },
        email: {
            enabled: true,
            transport: new LocalTransport()
        },
        driver: {
            type: 'stub'
        }
    }

    if (process.env.FF_TEST_DB_POSTGRES) {
        config.db.type = 'postgres'
        config.db.host = process.env.FF_TEST_DB_POSTGRES_HOST || 'localhost'
        config.db.port = process.env.FF_TEST_DB_POSTGRES_PORT || 5432
        config.db.user = process.env.FF_TEST_DB_POSTGRES_USER || 'postgres'
        config.db.password = process.env.FF_TEST_DB_POSTGRES_PASSWORD || 'secret'
        config.db.database = process.env.FF_TEST_DB_POSTGRES_DATABASE || 'flowforge_test'

        try {
            const { Client } = require('pg')
            const client = new Client({
                host: config.db.host,
                port: config.db.port,
                user: config.db.user,
                password: config.db.password
            })
            await client.connect()
            try {
                await client.query(`DROP DATABASE ${config.db.database}`)
            } catch (err) {
                // Don't mind if it doesn't exist
            }
            await client.query(`CREATE DATABASE ${config.db.database}`)
            await client.end()
        } catch (err) {
            console.log(err.toString())
            process.exit(1)
        }
    }

    const forge = await Forge({ config })

    await forge.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })
    const userAlice = await forge.db.models.User.create({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', email_verified: true, password: 'aaPassword' })
    const team1 = await forge.db.models.Team.create({ name: 'ATeam' })
    await team1.addUser(userAlice, { through: { role: Roles.Owner } })

    const projectType = {
        name: 'projectType1',
        description: 'default project type',
        active: true,
        properties: { foo: 'bar' },
        order: 1
    }
    forge.projectType = await forge.db.models.ProjectType.create(projectType)

    const templateProperties = {
        name: 'template1',
        active: true,
        description: '',
        settings: {
            httpAdminRoot: '',
            codeEditor: ''
        },
        policy: {
            httpAdminRoot: true,
            codeEditor: true
        }
    }
    const template = await forge.db.models.ProjectTemplate.create(templateProperties)
    template.setOwner(userAlice)
    await template.save()

    const stackProperties = {
        name: 'stack1',
        active: true,
        properties: { nodered: '2.2.2' }
    }
    const stack = await forge.db.models.ProjectStack.create(stackProperties)

    await stack.setProjectType(forge.projectType)

    const project1 = await forge.db.models.Project.create({ name: 'project1', type: '', url: '' })
    await team1.addProject(project1)
    await project1.setProjectStack(stack)
    await project1.setProjectTemplate(template)
    await project1.setProjectType(forge.projectType)

    await project1.reload({
        include: [
            { model: forge.db.models.Team }
        ]
    })

    forge.project = project1
    forge.template = template
    forge.stack = stack

    return forge
}
