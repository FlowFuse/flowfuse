const { Op } = require('sequelize')
const should = require('should') // eslint-disable-line

const { KEY_STACK_UPGRADE_HOUR } = require('../../../../../../forge/db/models/ProjectSettings')
const enforceTeamRulesTask = require('../../../../../../forge/ee/lib/autoUpdateStacks/tasks/enforce-team-rules')
const setup = require('../../setup')

describe.only('Automatic Stack Upgrade', function () {
    let app

    before(async function () {
        setup.setupStripe()
        app = await setup()

        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })

        const autoTeamTypeProperties = {
            name: 'AutoUpdate',
            order: 2,
            description: 'TeamType that forces Stack Updates',
            properties: {
                users: {
                    limit: 10
                },
                runtimes: {
                    limit: 20
                },
                devices: {
                    productId: 'prod_device',
                    priceId: 'price_device',
                    description: '$5/month',
                    limit: 10
                },
                billing: {
                    productId: 'prod_team',
                    priceId: 'price_team',
                    description: '$10/month',
                    proration: 'always_invoice'
                },
                trial: {
                    active: false
                },
                enableAllFeatures: true,
                features: {
                    fileStorageLimit: null,
                    contextLimit: null
                },
                teamBroker: {
                    clients: {
                        limit: 10
                    }
                },
                autoStackUpdate: {
                    enabled: true,
                    days: [0, 6],
                    hours: [0, 1, 2, 3, 4],
                    allowDisable: false
                }
            }
        }

        autoTeamTypeProperties.instances = defaultTeamType.properties.instances

        const autoTeamType = await app.db.models.TeamType.create(autoTeamTypeProperties)
        app.autoTeamType = autoTeamType
    })

    after(async function () {
        if (app) {
            await app.close()
            app = null
        }
        setup.resetStripe()
    })

    describe('Update after TeamType change', async function () {
        it('Instance properties updated', async function () {
            const instanceStartSettings = await app.db.models.ProjectSettings.findAll({
                where: {
                    ProjectId: app.instance.id,
                    key: {
                        [Op.like]: `${KEY_STACK_UPGRADE_HOUR}_%`
                    }
                }
            })
            instanceStartSettings.should.have.length(0)
            await app.team.updateTeamType(app.autoTeamType, { interval: 'month' })
            await enforceTeamRulesTask.run(app)
            const instanceAfterSettings = await app.db.models.ProjectSettings.findAll({
                where: {
                    ProjectId: app.instance.id,
                    key: {
                        [Op.like]: `${KEY_STACK_UPGRADE_HOUR}_%`
                    }
                }
            })
            instanceAfterSettings.should.have.length(1)
            instanceAfterSettings[0].value.hour.should.be.oneOf([0, 1, 2, 3, 4])
            const day = parseInt(instanceAfterSettings[0].key.split('_')[1])
            day.should.be.oneOf([0, 6])
        })
        it('Existing Instance properties not updated', async function () {
            // depends on previous test
            const instanceStartSettings = await app.db.models.ProjectSettings.findAll({
                where: {
                    ProjectId: app.instance.id,
                    key: {
                        [Op.like]: `${KEY_STACK_UPGRADE_HOUR}_%`
                    }
                }
            })
            instanceStartSettings.should.have.length(1)
            const day = parseInt(instanceStartSettings[0].key.split('_')[1])
            const hour = instanceStartSettings[0].value.hour
            await enforceTeamRulesTask.run(app)
            const instanceAfterSettings = await app.db.models.ProjectSettings.findAll({
                where: {
                    ProjectId: app.instance.id,
                    key: {
                        [Op.like]: `${KEY_STACK_UPGRADE_HOUR}_%`
                    }
                }
            })
            instanceAfterSettings.should.have.length(1)
            day.should.equal(parseInt(instanceAfterSettings[0].key.split('_')[1]))
            hour.should.equal(instanceAfterSettings[0].value.hour)
        })
    })
})
