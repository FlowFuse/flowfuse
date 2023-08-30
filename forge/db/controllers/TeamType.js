module.exports = {
    ensureDefaultTypeExists: async function (app) {
        const teamTypeCount = await app.db.models.TeamType.count()
        if (teamTypeCount === 0 || teamTypeCount === 1) {
            let defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
            if (!defaultTeamType || defaultTeamType.getProperty('userLimit') !== undefined) {
                // Either no defaultTeamType, or it is in the old format
                const properties = {
                    users: { },
                    devices: { },
                    features: {
                        'shared-library': true
                    },
                    instances: { }
                }

                // Get list of active instance types
                const instanceTypes = await app.db.models.ProjectType.findAll({ where: { active: true } })
                instanceTypes.forEach(instanceType => {
                    properties.instances[instanceType.hashid] = {
                        active: true
                    }
                    if (app.billing) {
                        // Copy over any instance type billing info
                        if (instanceType.properties?.billingDescription) {
                            properties.instances[instanceType.hashid].description = instanceType.properties?.billingDescription
                        }
                        if (instanceType.properties?.billingPriceId) {
                            properties.instances[instanceType.hashid].priceId = instanceType.properties?.billingPriceId
                        }
                        if (instanceType.properties?.billingProductId) {
                            properties.instances[instanceType.hashid].productId = instanceType.properties?.billingProductId
                        }
                    }
                })

                if (app.settings.get('user:team:trial-mode')) {
                    // The platform is in trial mode. Migrate the settings into the default
                    // team type to ensure existing trial teams are kept ticking over
                    properties.trial = {
                        active: true,
                        instanceType: app.settings.get('user:team:trial-mode:projectType'),
                        duration: app.settings.get('user:team:trial-mode:duration')
                    }
                }

                if (!defaultTeamType) {
                    // Create the default starter type
                    defaultTeamType = await app.db.models.TeamType.create({
                        name: 'starter',
                        active: true,
                        order: 0,
                        description: 'Collaborate on applications with a starter team',
                        properties
                    })
                } else {
                    defaultTeamType.description = 'Collaborate on applications with a starter team'
                    defaultTeamType.order = 0
                    defaultTeamType.properties = properties
                    await defaultTeamType.save()
                }

                if (app.billing) {
                    // Billing is enabled. Create the expected team types for EE
                    // with billing enabled. But do not enable them as they require
                    // additional configuration before going live.
                    const starterProperties = {
                        users: { limit: 2 },
                        devices: { limit: 2, free: 2 },
                        features: { },
                        instances: { }
                    }
                    instanceTypes.forEach(instanceType => {
                        // Look for the 'small' instance type
                        if (/small/i.test(instanceType.name)) {
                            starterProperties.instances[instanceType.hashid] = {
                                active: true,
                                limit: 2,
                                free: 2
                            }
                        }
                    })
                    await app.db.models.TeamType.create({
                        name: 'Starter',
                        active: false,
                        order: 1,
                        description: 'Collaborate on applications with a starter team',
                        properties: starterProperties
                    })

                    const premiumProperties = {
                        users: { },
                        devices: { },
                        features: { },
                        instances: { }
                    }
                    instanceTypes.forEach(instanceType => {
                        // Look for the 'small' instance type
                        premiumProperties.instances[instanceType.hashid] = {
                            active: true
                        }
                    })
                    await app.db.models.TeamType.create({
                        name: 'Team',
                        active: false,
                        order: 2,
                        description: '',
                        properties: premiumProperties
                    })
                }
            }
        }
    },
    /**
     * Called by the setup wizard, ensures the default InstanceType is enabled
     * for the default TeamType
     * @param {InstanceType} instanceType the instanceType to enable
     */
    enableInstanceTypeForDefaultType: async function (app, instanceType) {
        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { id: 1 } })
        if (defaultTeamType) {
            const props = defaultTeamType.properties
            props.instances[instanceType.hashid] = {
                active: true
            }
            defaultTeamType.properties = props
            await defaultTeamType.save()
        }
    }
}
