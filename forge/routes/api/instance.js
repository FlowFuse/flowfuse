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
 	app.get('/', async (request, reply) => {
 		let instance = {
 				name: "instance1",
 				namespace: "default",
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
 				required: ['name','namespace', 'type'],
 				properties: {
 					name: { type: 'string'},
 					namespace: {type: 'string'},
 					type: { type: 'string'}
 				}
 			}
 		}
 	}, async (request, reply) => {
 		reply.send({
 			name: request.body.name, 
 			namespace: request.body.namespace,
 			url: "https://" + request.body.name + ".example.com"
 		})
 	})

 	/**
 	 * Delete an instance
 	 * @name /api/v1/instance
 	 * @memberof foreg.routes.api.instance 
 	 */
 	app.delete('/', {
 		schema: {
 			body: {
 				type: 'object',
 				required: ['name','namespace'],
 				properties: {
 					name: { type: 'string'},
 					namespace: {type: 'string'}
 				}
 			}
 		}
 	}, async (request, reply) => {
 		reply.send({ status: "okay"})
 	})
 }