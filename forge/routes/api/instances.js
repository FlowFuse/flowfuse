/**
 * Instances api routes
 * 
 *   /api/v1/instance
 * 
 * @namespace instances
 * @memberof forge.route.api
 */
module.exports = async function(app) {
    /**
     * Get the details of a givevn instance
     * @name /api/v1/instance
     * @static
     * @memberof forge.routes.api.instance
     */
    app.get('/', async (request, reply) => {
        let instances = [
            {
                name: "instance1",
                namespace: "default",
                url: "https://instance1.example.com"
            },
            {
                name: "instance2",
                namespace: "default",
                url: "https://instance2.example.com"
            }
        ]
        reply.send(instances)
    })
}