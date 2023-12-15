const { Op } = require("sequelize")
const { Roles } = require("../lib/roles")

module.exports = {
    init: function (app) {
        return {
            generate: async function(projectId, event) {
                if (app.postoffice.enabled) {
                    const project = await app.db.models.Project.byId(projectId)
                    const settings = await app.db.controllers.Project.getRuntimeSettings(project)
                    const emailAlerts = settings.emailAlerts
                    let template
                    if (emailAlerts.crash && event === 'crashed') {
                        template = 'Crashed'
                    } else if (emailAlerts.safe && event === 'safe-mode') {
                        template = 'SafeMode'
                    }
                    if (!template) {
                        return
                    }
                    const team = await app.db.models.Team.byId(project.Team.id)
                    const where = {
                        TeamId: team.id
                    }
                    switch (emailAlerts.recipients) {
                        case 'both':
                            where.role = {
                                [Op.or]: {
                                    [Op.eq]: Roles.Member,
                                    [Op.eq]: Roles.Admin
                                }
                            }
                            break
                        case 'members':
                            where.role = Roles.Member
                            break
                        case 'owners':
                            where.role = Roles.Owner
                            break
                    }
                    const users  = (await app.db.models.TeamMember.findAll({ where, include: app.db.models.User })).map(tm => tm.User)
                    if (users.length > 0) {
                        users.forEach(user => {
                            app.postoffice.send(user, template, { name: project.name, url: `${app.config.base_url}/instance/${project.id}`  })
                        })
                    }
                }
            }
        }
    },
}