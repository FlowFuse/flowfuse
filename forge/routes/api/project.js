/**
 * Instance api routes
 *
 * - /api/v1/project
 *
 * @namespace project
 * @memberof forge.routes.api
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
     * @memberof forge.routes.api.project
     */
    app.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['name','options', 'team'],
                properties: {
                    name: { type: 'string' },
                    team: { type: ['string', 'number'] },
                    options: { type: 'object'}
                }
            }
        }
    }, async (request, reply) => {
        const teamMembership = await request.session.User.getTeamMembership(request.body.team);
        const team = teamMembership.get('Team');
        // Assume membership is enough to allow project creation.
        // If we have roles that limit creation, that will need to be checked here.
        if (teamMembership) {

            const project = await app.db.models.Project.create({
                name: request.body.name,
                type: request.body.options.type,
                url: "placeholder"
            })
            const authClient = await app.db.controllers.AuthClient.createClientForProject(project);

            const containerOptions = {
                name: request.body.name,
                ...request.body.options,
                ...authClient
            }
            
            await team.addProject(project);
            const container = await app.containers.create(project.id, containerOptions);

            project.url = container.url
            await project.save()

            const result = await app.db.views.Project.project(project);
            result.meta = await app.containers.details(project.id);
            result.team = team.id;
            reply.send(result);
        } else {
            reply.status(401).send({error: "Current user not in team " + request.body.team})
        }
    })
    /**
     * Delete an project
     * @name /api/v1/project/:id
     * @memberof forge.routes.api.project
     */
    app.delete('/:id', async (request, reply) => {
        let project = await app.db.models.Project.byId(request.params.id);
        if (project) {
            app.containers.remove(project.id)
            .then( () => {
                project.destroy();
                reply.send({ status: "okay"});
            })
            .catch(err => {
                console.log("missing", err)
                console.log(err)
                reply.status(500).send({})
            })
        } else {
            reply.status(404).send({error: "Project not found"})
        }

    })

    /**
     * Send commands
     *
     * e.g. start/stop/restart
     *
     * @name /api/v1/project/:id
     * @memberof forge.routes.api.project
     */
    app.post('/:id', async (request,reply) => {
        let project = await app.db.models.Project.byId(request.params.id);
        if (project) {
            let meta = await app.containers.details(project.name)
            reply.send({})
        } else {
            reply.status(404).send({error: "Project not found"})
        }
    })
}
