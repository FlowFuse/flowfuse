const crypto = require('crypto')

const { Roles, RoleNames } = require('../../lib/roles')

function provisioningError (message, code) {
    const err = new Error(message)
    err.code = code
    return err
}

module.exports = {

    createTeamForUser: async function (app, teamDetails, user) {
        const newTeam = await app.db.models.Team.create(teamDetails)
        await newTeam.reload({
            include: [{ model: app.db.models.TeamType }]
        })
        await app.db.controllers.Team.addUser(newTeam, user, Roles.Owner)

        // Reinflate the object now the user has been added
        const team = await app.db.models.Team.bySlug(newTeam.slug)

        // Record in our Product tracking
        app.product.capture(user.username, '$ff-team-created', {
            'team-name': team.name,
            'created-at': team.createdAt
        }, {
            team: team.id
        })

        return team
    },

    /**
     * Create the default application for a team, named after the user.
     */
    createDefaultApplication: async function (app, team, user) {
        const applicationName = `${user.name}'s Application`
        const application = await app.db.models.Application.create({
            name: applicationName.charAt(0).toUpperCase() + applicationName.slice(1),
            TeamId: team.id
        })
        await app.auditLog.Team.application.created(user, null, team, application)
        await app.auditLog.Application.application.created(user, null, application)
        return application
    },

    /**
     * Provision the default workspace in a team: the application and hosted
     * instance a classic signup would create. The instance type comes from the
     * `user:team:auto-create:instanceType` platform setting.
     *
     * Throws errors with a `code` property (`team_not_empty`,
     * `invalid_instance_type`, `invalid_stack`, `invalid_template`) so callers
     * can decide how to surface them.
     */
    provisionDefaultWorkspace: async function (app, team, user) {
        const existingInstances = await app.db.models.Project.byTeam(team.hashid)
        if (existingInstances.length > 0) {
            throw provisioningError('Team already has instances', 'team_not_empty')
        }

        const instanceTypeId = app.settings.get('user:team:auto-create:instanceType')
        const instanceType = instanceTypeId && await app.db.models.ProjectType.byId(instanceTypeId)
        if (!instanceType) {
            throw provisioningError(`Instance type with id ${instanceTypeId} from 'user:team:auto-create:instanceType' not found`, 'invalid_instance_type')
        }
        const instanceStack = await instanceType.getDefaultStack() || (await instanceType.getProjectStacks())?.[0]
        if (!instanceStack) {
            throw provisioningError(`Unable to find a stack for use with instance type ${instanceTypeId}`, 'invalid_stack')
        }
        const instanceTemplate = await app.db.models.ProjectTemplate.findOne({ where: { active: true } })
        if (!instanceTemplate) {
            throw provisioningError('Unable to find the default instance template', 'invalid_template')
        }

        const applications = await app.db.models.Application.byTeam(team.id)
        let application = applications[0]
        const applicationCreated = !application
        if (applicationCreated) {
            application = await app.db.controllers.Team.createDefaultApplication(team, user)
        }

        const safeTeamName = team.name.toLowerCase().replace(/[\W_]/g, '-')
        const safeUserName = user.username.toLowerCase().replace(/[\W_]/g, '-')
        const instance = await app.db.controllers.Project.create(team, application, user, instanceType, instanceStack, instanceTemplate, {
            name: `${safeTeamName}-${safeUserName}-${crypto.randomBytes(4).toString('hex')}`
        })

        return { application, instance, applicationCreated }
    },

    changeUserRole: async function (app, teamHashId, userHashId, role) {
        const transaction = await app.db.sequelize.transaction()
        try {
            const user = await app.db.models.User.byId(userHashId)
            const team = await app.db.models.Team.byId(teamHashId)
            if (!user) {
                throw new Error('User not found')
            }
            if (!team) {
                throw new Error('Team not found')
            }
            if (!RoleNames[role] || role === Roles.Admin || role === Roles.None) {
                throw new Error('Invalid role')
            }

            const existingRole = await user.getTeamMembership(team.id)
            if (!existingRole) {
                throw new Error('User not in team')
            }
            const oldRole = existingRole.role
            if (oldRole === role) {
                return { user, team, oldRole, role }
            }
            if (oldRole === Roles.Owner && role === Roles.Member) {
                const ownerCount = await team.ownerCount(transaction)
                if (ownerCount === 1) {
                    throw new Error('Cannot remove last owner')
                }
                if (role < Roles.Member) {
                    const token = await app.db.models.AccessToken.findOne({
                        where: {
                            ownerType: 'npm',
                            ownerId: `${userHashId}@${teamHashId}`
                        }
                    })
                    if (token) {
                        await token.destroy()
                    }
                }
            }
            existingRole.role = role
            await existingRole.save({ transaction })
            await transaction.commit()
            return { user, team, oldRole, role }
        } catch (err) {
            transaction.rollback()
            throw err
        }
    },

    changeUserTeamPermissions: async function (app, teamHashId, userHashId, permissions) {
        const user = await app.db.models.User.byId(userHashId)
        const team = await app.db.models.Team.byId(teamHashId)
        if (!user) {
            throw new Error('User not found')
        }
        if (!team) {
            throw new Error('Team not found')
        }

        const existingMembership = await user.getTeamMembership(team.id)
        if (!existingMembership) {
            throw new Error('User not in team')
        }
        existingMembership.permissions = permissions
        await existingMembership.save()
    },

    addUser: async function (app, team, user, userRole) {
        const existingMembership = await user.getTeamMembership(team.id)
        if (existingMembership !== null) {
            throw new Error('User already in this team')
        }

        const currentTeamMemberCount = await team.memberCount()
        if (!team.TeamType) {
            await team.reload({
                include: [{ model: app.db.models.TeamType }]
            })
        }
        const userLimit = await team.getUserLimit()
        if (userLimit > 0 && currentTeamMemberCount >= userLimit) {
            throw new Error('Team user limit reached')
        }

        await team.addUser(user, { through: { role: userRole } })
    },
    /**
     * Remove a user from a team
     * @params team
     * @params userOrHashId
     * @params userRole
     * @return boolean - if the user was removed.
     *
     */
    removeUser: async function (app, team, user, userRole) {
        if (!userRole) {
            userRole = await user.getTeamMembership(team.id)
        }
        if (userRole) {
            if (userRole.role === Roles.Owner) {
                const ownerCount = await team.ownerCount()
                if (ownerCount === 1) {
                    throw new Error('Cannot remove last owner')
                }
            }
            if (user.defaultTeamId === team.id) {
                await user.setDefaultTeam(null)
            }
            await userRole.destroy()

            // Clean up scoped PAT entries that reference this team.
            // Find which tokens had scopes for this team, remove those
            // entries, then delete any tokens left with zero team scopes
            // (they were scoped exclusively to the removed team and would
            // otherwise silently escalate to team-global access).
            const affectedScopes = await app.db.models.AccessTokenTeamScope.findAll({
                where: { UserId: user.id, TeamId: team.id },
                attributes: ['AccessTokenId']
            })
            const affectedTokenIds = affectedScopes.map(s => s.AccessTokenId)
            if (affectedTokenIds.length > 0) {
                await app.db.sequelize.transaction(async (t) => {
                    await app.db.models.AccessTokenTeamScope.destroy({
                        where: { UserId: user.id, TeamId: team.id },
                        transaction: t
                    })
                    for (const tokenId of affectedTokenIds) {
                        const remaining = await app.db.models.AccessTokenTeamScope.count({
                            where: { AccessTokenId: tokenId },
                            transaction: t
                        })
                        if (remaining === 0) {
                            await app.db.models.AccessToken.destroy({
                                where: { id: tokenId },
                                transaction: t
                            })
                        }
                    }
                })
            }

            await app.db.controllers.StorageSession.removeUserFromTeamSessions(user, team)

            return true
        }

        return false
    }
}
