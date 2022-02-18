/**
 * Project stack api routes
 *
 * - /api/v1/stacks
 *
 * @namespace stacks
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    /**
     * Get a list of all stacks
     * @name /api/v1/stacks/:id
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.get('/', async (request, reply) => {
    })

    /**
     * Get the details of a stack
     * @name /api/v1/stacks/:id
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.get('/:stackId', async (request, reply) => {
    })

    /**
     * Create a stack
     * @name /api/v1/stacks
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.post('/', {
        preHandler: app.needsPermission('stack:create')
    }, async (request, reply) => {
    })

    /**
     * Delete a stack
     * @name /api/v1/stacks
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.delete('/:stackId', {
        preHandler: app.needsPermission('stack:delete')
    }, async (request, reply) => {
    })

    /**
     * Update a stack
     * @name /api/v1/stacks
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.put('/:stackId', {
        preHandler: app.needsPermission('stack:edit')
    }, async (request, reply) => {
    })
}
