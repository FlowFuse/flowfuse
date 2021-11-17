/**
 * Node-RED Storage Backend
 *
 * - /storage
 *
 * @namespace storage
 * @memberof forge.storage
 */
module.exports = async function(app) {

  app.addHook('preHandler',app.verifyToken);

  app.post('/:id/flows', async (request, response) => {
    let id = request.params.id;
    // Check if the project exists first
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let flow = await app.db.models.StorageFlow.byProject(id);
      if (flow) {
        flow.flow = JSON.stringify(request.body);
        await flow.save();
      } else {
        flow = await app.db.models.StorageFlow.create({
          flow: JSON.stringify(request.body),
          ProjectId: id
        })

        await flow.save();
      }
      response.send(request.body);
    } else {
      response.status(404).send();
    }
  });

  app.get('/:id/flows', async (request, response) => {
    let id = request.params.id;
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let flow = await app.db.models.StorageFlow.byProject(id);
      if (flow) {
        response.send(flow.flow)
      } else {
        response.send([])
      }
    } else {
      response.status(404).send();
    }
  });

  app.post('/:id/credentials', async (request, response) => {
    let id = request.params.id;
    // Check if the project exists first
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let creds = await app.db.models.StorageCredentials.byProject(id);
      if (creds) {
        creds.credentials = JSON.stringify(request.body);
        await creds.save();
      } else {
        creds = await app.db.models.StorageCredentials.create({
          credentials: JSON.stringify(request.body),
          ProjectId: id
        })
        await creds.save();
      }
      response.send(request.body);
    } else {
      response.status(404).send();
    }
  });

  app.get('/:id/credentials', async (request, response) => {
    let id = request.params.id;
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let creds = await app.db.models.StorageCredentials.byProject(id);
      if (creds) {
        response.send(creds)
      } else {
        response.send({})
      }
    }
  });

  app.post('/:id/settings', async (request, response) => {
    let id = request.params.id;
    // Check if the project exists first
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let settings = await app.db.models.StorageSettings.byProject(id);
      if (settings) {
        settings.settings = JSON.stringify(request.body);
        await settings.save();
      } else {
        settings = await app.db.models.StorageSettings.create({
          settings: JSON.stringify(request.body),
          ProjectId: id
        })
        await settings.save();
      }
      response.send(request.body);
    } else {
      response.status(404).send();
    }
  });

  app.get('/:id/settings', async (request, response) => {
    let id = request.params.id;
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let settings = await app.db.models.StorageSettings.byProject(id);
      if (settings) {
        response.send(settings.settings)
      } else {
        response.send({})
      }
    }
  });

  app.post('/:id/sessions', async (request, response) => {
    let id = request.params.id;
    // Check if the project exists first
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let sessions = await app.db.models.StorageSession.byProject(id);
      if (sessions) {
        sessions.sessions = JSON.stringify(request.body);
        await sessions.save();
      } else {
        sessions = await app.db.models.StorageSession.create({
          sessions: JSON.stringify(request.body),
          ProjectId: id
        })
        await sessions.save();
      }
      response.send(request.body);
    } else {
      response.status(404).send();
    }
  });

  app.get('/:id/sessions', async (request, response) => {
    let id = request.params.id;
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let sessions = await app.db.models.StorageSession.byProject(id);
      if (sessions) {
        response.send(sessions)
      }
    } else {
      response.status(404).send();
    }
  });

  app.post('/:id/library/:type', 
    {
      schema:{
        body: {
          type: 'object',
          required: ['name', 'body'],
          properties: {
            name: { type: 'string' },
            meta: { type: 'object'},
            body: { type: ['string', 'object']}
          }
        },
        params: {
          // type: { type: 'string', enum: [ 'flows', 'functions', 'templates' ] },
          id: { type: 'string' }
        }
      }
    },
    async (request, response) => {
      let id = request.params.id;
      let type = request.params.type;
      let body = request.body.body;
      let name = request.body.name;
      let meta = request.body.meta;

      if (typeof body === 'object') {
        body = JSON.stringify(body)
      }

      let direct = await app.db.models.StorageLibrary.byName(id, type, name);

      if (direct) {
        direct.body = body;
        direct.meta = JSON.stringify(meta)
        await direct.save();
      } else {
        let name = request.body.name;
        let lib = await app.db.models.StorageLibrary.create({
          name: request.body.name,
          type: type,
          meta: JSON.stringify(meta),
          body: body,
          ProjectId: id
        });
      }

      response.status(201).send();
    }
  );

  app.get('/:id/library/:type', 
    {
      schema: {
        query: {
          name: { type: 'string' }
        },
        params: {
          // type: { type: 'string', enum: [ 'flows', 'functions', 'templates' ]},
          id: { type: 'string' }
        }
      }
    },
    async (request, response) => {
      let id = request.params.id;
      let type = request.params.type;
      let name = request.query.name

      console.log("query",request.query);

      let reply = []

      let direct = await app.db.models.StorageLibrary.byName(id, type, name);

      if (direct) {
        console.log(direct.body)
        if (type == 'flows' ) {
          reply = JSON.parse(direct.body)
        } else {
          reply = direct.body
        }
      } else {
        // console.log("name",name)
        let path = name.split('/')


        let all = await app.db.models.StorageLibrary.byType(id, type);
        all.forEach(entry => {
          // console.log("entry.name",entry.name)
          let entryPath = entry.name.split('/')
          if (entry.name.startsWith(name)){
            let short = entry.name.substring(name.length)
            // console.log("short", short)
            if (short.charAt(0) == '/') {
              short = short.substring(1)
            }
            // console.log("short", short)
            // console.log(short.indexOf('/'))
            if (short.indexOf('/') == -1) {
              reply.push({fn: short, ...JSON.parse(entry.meta)})
            } else {
              reply.push(short.split('/')[0])
            }
          }
        })
      }

        console.log("reply", reply)

      response.send(reply)
    }
  );

}
