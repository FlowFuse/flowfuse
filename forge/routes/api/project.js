/**
 * Instance api routes
 *
 *   /api/v1/project
 *
 * @namespace project
 * @memberof forge.route.api
 */
 module.exports = async function(app) {

    /**
     * Get the details of a givevn project
     * @name /api/v1/project/:id
     * @static
     * @memberof forge.routes.api.project
     */
    app.get('/:id', async (request, reply) => {
        const project = await app.db.models.Project.byId(request.params.id)
        if (project) {
            const result = await app.db.views.Project.project(project);
            result.meta = await app.containers.details(project.name);
            result.team = await app.db.views.Team.team(project.Team);
            reply.send(result)
        } else {
            reply.status(404).send({error: "Project not found"});
        }
    })

    /**
     * Create an new project
     * @name /api/v1/project
     *
     */
    app.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['name','options', 'type'],
                properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    team: { type: 'number'},
                    options: { type: 'object'}
                }
            }
        }
    }, async (request, reply) => {
        //check is current user is member of supplied team?
        request.session.User.getTeams().then(teams => {
            let found = false;
            teams.forEach(t => {
                if (t.id === request.body.team) {
                    found = true
                    app.containers.create(request.body.name, request.body.options)
                    .then(container => {
                        if (container) {
                            app.db.models.Project.create({
                                name: request.body.name,
                                type: request.body.type,
                                url: container.url
                            }).then(async project => {
                                let team = await app.db.models.Team.findOne({where:{id: request.body.team}})
                                project.setTeam(team);
                                project = project.toJSON()

                                // project.meta = container
                                reply.send(project)
                            })
                        }
                    })
                    .catch(err => {
                        //need some better rollback logic here
                        console.log(err)
                        reply.status(500).send({error: "Something went wrong"})
                    })
                }
                if (!found) {
                    reply.status(401).send({error: "Current user not in team " + request.body.team})
                }
            })
        })
    })

    /**
     * Delete an project
     * @name /api/v1/project/:id
     * @memberof foreg.routes.api.project
     */
    app.delete('/:id', async (request, reply) => {
        let project = await app.db.models.Project.byId(request.params.id);
        if (project) {
            app.containers.remove(project.name)
            .then( () => {
                project.destroy();
                reply.send({ status: "okay"});
            })
            .catch(err => {
                console.log("missing")
                reply.status(500).send({})
            })
        } else {
            reply.status(404).send({error: "Project not found"})
        }

    })
 }
