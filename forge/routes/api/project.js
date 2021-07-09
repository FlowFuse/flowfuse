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
 	 * @name /api/v1/project
 	 * @static
 	 * @memberof forge.routes.api.project
 	 */
 	app.get('/:id', async (request, reply) => {
 		let project = {
 				id: "45ec7fd2-3e80-4ba5-ad19-e756e354c928",
 				name: "instance1",
 				url: "https://instance1.example.com"
 		}
 		reply.send(project)
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
 	 * Delete an project
 	 * @name /api/v1/project
 	 * @memberof foreg.routes.api.project 
 	 */
 	app.delete('/:id', async (request, reply) => {
 		reply.send({ status: "okay"})
 	})
 }