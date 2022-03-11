/**
 * Project Template api routes
 *
 * - /api/v1/templates
 *
 * @namespace templates
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    /**
     * Get a list of all templates
     * @name /api/v1/templates/:id
     * @static
     * @memberof forge.routes.api.templates
     */
    app.get('/', async (request, reply) => {
    })

    /**
     * Get the details of a template
     * @name /api/v1/templates/:id
     * @static
     * @memberof forge.routes.api.templates
     */
    app.get('/:templateId', async (request, reply) => {
    })

    /**
     * Create a template
     * @name /api/v1/templates
     * @static
     * @memberof forge.routes.api.templates
     */
    app.post('/', {
        preHandler: app.needsPermission('template:create')
    }, async (request, reply) => {
    })

    /**
     * Delete a template
     * @name /api/v1/templates
     * @static
     * @memberof forge.routes.api.templates
     */
    app.delete('/:templateId', {
        preHandler: app.needsPermission('template:delete')
    }, async (request, reply) => {
    })

    /**
     * Update a template
     * @name /api/v1/templates
     * @static
     * @memberof forge.routes.api.templates
     */
    app.put('/:templateId', {
        preHandler: app.needsPermission('template:edit')
    }, async (request, reply) => {
    })
}
