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
        let project = undefined
        try {
            project = await app.db.models.Project.byId(request.params.id)
        } catch (err) {

        }
        if (project) {
            reply.send(project)
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
                    url: { type: 'string' },
                    team: { type: 'number'},
                    options: { type: 'object'}
                }
            }
        }
    }, async (request, reply) => {
        let project = await app.db.models.Project.create({
            name: request.body.name,
            type: request.body.type,
            url: request.body.url
        })
        if (project) {
            project.addTeam(request.body.team);
            reply.send(project)
        } else {
            reply.status(500).send({error: "Something went wrong"})
        }
    })

    /**
     * Delete an project
     * @name /api/v1/project/:id
     * @memberof foreg.routes.api.project 
     */
    app.delete('/:id', async (request, reply) => {
        let project = await app.db.models.Project.byId(request.params.id);
        if (project) {
            await project.destroy();
            reply.send({ status: "okay"});
        } else {
            reply.status(404).send({error: "Project not found"})
        }
        
    })
 }