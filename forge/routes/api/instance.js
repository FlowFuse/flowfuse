/**
 * Instance api routes
 * 
 *   /api/v1/instance
 * 
 * @namespace instance
 * @memberof forge.route.api
 */
 module.exports = async function(app) {

 	/**
 	 * Get the details of a givevn instance
 	 * @name /api/v1/instance
 	 * @static
 	 * @memberof forge.routes.api.instance
 	 */
 	app.get('/:id', async (request, reply) => {
 		let instance = {
 				id: "45ec7fd2-3e80-4ba5-ad19-e756e354c928",
 				name: "instance1",
 				url: "https://instance1.example.com"
 		}
 		reply.send(instance)
 	})

 	/**
 	 * Create an new instance
 	 * @name /api/v1/instance
 	 * 
 	 */
 	app.post('/', {
 		schema: {
 			body: {
 				type: 'object',
 				required: ['name','options', 'type'],
 				properties: {
 					name: { type: 'string'},
 					type: { type: 'string'},
 					options: { type: 'object'}
 				}
 			}
 		}
 	}, async (request, reply) => {
 		reply.send({
 			name: request.body.name, 
 			namespace: request.body.options.snamespace,
 			url: "https://" + request.body.name + ".example.com"
 		})
 	})

 	/**
 	 * Delete an instance
 	 * @name /api/v1/instance
 	 * @memberof foreg.routes.api.instance 
 	 */
 	app.delete('/:id', async (request, reply) => {
 		reply.send({ status: "okay"})
 	})
 }